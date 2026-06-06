// public/js/auth-validacion.js
// Inyecta validaciones de contraseña y correo en los modales
// de registro y restablecer DESPUÉS de que modal-3d.js los transforma.

(function () {
  'use strict';

  // ── CSS del medidor (se inyecta una sola vez en <head>) ──────────────
  const CSS = `
    .pass-strength-wrap {
      margin-top: 10px;
      margin-bottom: 4px;
    }
    .pass-strength-bar-bg {
      height: 5px;
      background: rgba(255,255,255,0.12);
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
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.03em;
    }
    .pass-reqs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px 14px;
      margin-top: 8px;
    }
    .pass-req {
      font-size: 0.74rem;
      display: flex;
      align-items: center;
      gap: 5px;
      color: rgba(255,255,255,0.4);
      transition: color 0.2s;
    }
    .pass-req.ok { color: #22c55e; }
    .pass-req i  { font-size: 0.65rem; }
    .av-feedback {
      font-size: 0.76rem;
      font-weight: 600;
      margin-top: 5px;
      min-height: 16px;
      padding-left: 2px;
    }
    /* input de confirmación: copiar el estilo visual del input existente */
    .av-confirm-wrap {
      position: relative;
      margin-top: 14px;
    }
    .av-confirm-input {
      width: 100%;
      padding: 12px 44px 12px 40px;
      border-radius: 10px;
      border: 1.5px solid rgba(0, 223, 252, 0.4);
      background: rgba(255,255,255,0.07);
      color: #e0f7ff;
      font-size: 0.95rem;
      outline: none;
      transition: border-color 0.2s;
    }
    .av-confirm-input::placeholder { color: rgba(255,255,255,0.35); }
    .av-confirm-input:focus { border-color: #00dffc; }
    .av-confirm-icon {
      position: absolute;
      left: 13px;
      top: 50%;
      transform: translateY(-50%);
      color: #00dffc;
      font-size: 1rem;
      pointer-events: none;
    }
    .av-confirm-eye {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: rgba(255,255,255,0.5);
      cursor: pointer;
      font-size: 1.1rem;
      padding: 0;
      line-height: 1;
    }
  `;

  function inyectarCSS() {
    if (document.getElementById('av-styles')) return;
    const style = document.createElement('style');
    style.id = 'av-styles';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  // ── Validadores ─────────────────────────────────────────────────────

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

  // ── Crear el bloque de medidor HTML ─────────────────────────────────

  function crearMedidor(prefijo) {
    const div = document.createElement('div');
    div.className = 'pass-strength-wrap';
    div.id = prefijo + '-strength-wrap';
    div.style.display = 'none';
    div.innerHTML = `
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
      </div>`;
    return div;
  }

  function actualizarMedidor(pwd, prefijo) {
    const wrap  = document.getElementById(prefijo + '-strength-wrap');
    const bar   = document.getElementById(prefijo + '-bar');
    const label = document.getElementById(prefijo + '-label');
    if (!wrap) return;

    if (!pwd) { wrap.style.display = 'none'; return; }
    wrap.style.display = 'block';

    const { reqs, nivel } = analizarPassword(pwd);
    bar.style.width      = nivel.w;
    bar.style.background = nivel.color;
    label.textContent    = nivel.label;
    label.style.color    = nivel.color;

    const mapeaReq = { len: 'req-len', upper: 'req-upper', lower: 'req-lower', num: 'req-num', special: 'req-special' };
    Object.entries(mapeaReq).forEach(([key, sufijo]) => {
      const el = document.getElementById(prefijo + '-' + sufijo);
      if (!el) return;
      el.classList.toggle('ok', reqs[key]);
      el.querySelector('i').className = reqs[key] ? 'bi bi-check-circle-fill' : 'bi bi-circle-fill';
    });
  }

  function crearFeedback(id) {
    const span = document.createElement('div');
    span.className = 'av-feedback';
    span.id = id;
    return span;
  }

  // ── Buscar el input de contraseña dentro del modal renderizado ───────

  function encontrarInputPassword(modal) {
    // modal-3d puede poner el input como type=password
    return modal.querySelector('input[type="password"], input[name="contrasena"]');
  }

  function encontrarInputEmail(modal) {
    return modal.querySelector('input[type="email"], input[name="correo"]');
  }

  // ── Inyectar en REGISTRO ─────────────────────────────────────────────

  function configurarRegistro(modal) {
    const passInput  = encontrarInputPassword(modal);
    const emailInput = encontrarInputEmail(modal);
    const form       = modal.querySelector('form');
    if (!passInput || !form) return;

    // Evitar doble inyección
    if (form.dataset.avInit === '1') return;
    form.dataset.avInit = '1';

    // 1. Medidor debajo del campo contraseña
    const medidor = crearMedidor('av-reg');
    passInput.closest('div, .input-group-animated') 
      ? passInput.closest('div').insertAdjacentElement('afterend', medidor)
      : passInput.insertAdjacentElement('afterend', medidor);

    // 2. Feedback de correo
    if (emailInput) {
      const fbEmail = crearFeedback('av-reg-email-fb');
      const emailWrap = emailInput.closest('div') || emailInput;
      emailWrap.insertAdjacentElement('afterend', fbEmail);

      emailInput.addEventListener('input', () => {
        const ok = validarCorreo(emailInput.value);
        fbEmail.textContent = emailInput.value
          ? (ok ? '✓ Correo válido' : '✗ Ingresa un correo válido (ej: usuario@gmail.com)')
          : '';
        fbEmail.style.color = ok ? '#22c55e' : '#ef4444';
      });
    }

    // 3. Campo confirmar contraseña — insertar antes del botón submit
    const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
    const confirmWrap = document.createElement('div');
    confirmWrap.className = 'av-confirm-wrap';
    confirmWrap.innerHTML = `
      <i class="bi bi-shield-lock-fill av-confirm-icon"></i>
      <input type="password" class="av-confirm-input" id="av-confirm-input" placeholder="Confirmar contraseña">
      <button type="button" class="av-confirm-eye" id="av-confirm-eye">
        <i class="bi bi-eye-slash"></i>
      </button>`;

    const fbConfirm = crearFeedback('av-confirm-fb');

    if (submitBtn) {
      submitBtn.insertAdjacentElement('beforebegin', confirmWrap);
      submitBtn.insertAdjacentElement('beforebegin', fbConfirm);
    } else {
      form.appendChild(confirmWrap);
      form.appendChild(fbConfirm);
    }

    const confirmInput = document.getElementById('av-confirm-input');
    const confirmEye   = document.getElementById('av-confirm-eye');

    // Toggle ojo confirmar
    if (confirmEye && confirmInput) {
      confirmEye.addEventListener('click', () => {
        const isPass = confirmInput.type === 'password';
        confirmInput.type = isPass ? 'text' : 'password';
        confirmEye.querySelector('i').className = isPass ? 'bi bi-eye' : 'bi bi-eye-slash';
      });
    }

    // Eventos tiempo real
    passInput.addEventListener('input', () => {
      actualizarMedidor(passInput.value, 'av-reg');
      if (confirmInput && confirmInput.value) actualizarConfirm();
    });

    function actualizarConfirm() {
      if (!confirmInput) return;
      const coincide = passInput.value === confirmInput.value;
      const fb = document.getElementById('av-confirm-fb');
      if (!fb) return;
      if (!confirmInput.value) { fb.textContent = ''; return; }
      fb.textContent = coincide ? '✓ Las contraseñas coinciden' : '✗ Las contraseñas no coinciden';
      fb.style.color = coincide ? '#22c55e' : '#ef4444';
    }

    if (confirmInput) {
      confirmInput.addEventListener('input', actualizarConfirm);
    }

    // Validación al enviar
    form.addEventListener('submit', function (e) {
      const correo  = emailInput ? emailInput.value.trim() : '';
      const pwd     = passInput.value;
      const confirm = confirmInput ? confirmInput.value : '';
      const { score } = analizarPassword(pwd);
      let error = null;

      if (emailInput && !validarCorreo(correo)) {
        error = 'El correo electrónico no es válido.';
      } else if (score < 3) {
        error = 'La contraseña es muy débil. Agrega mayúsculas, números o símbolos.';
      } else if (confirmInput && pwd !== confirm) {
        error = 'Las contraseñas no coinciden.';
      }

      if (error) {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (typeof showToast === 'function') showToast(error, 'error');
        else if (window.mostrarToast) window.mostrarToast(error, 'error');
      }
    }, true);
  }

  // ── Inyectar en RESTABLECER ──────────────────────────────────────────

  function configurarReset(modal) {
    const passInput  = encontrarInputPassword(modal);
    const emailInput = encontrarInputEmail(modal);
    const form       = modal.querySelector('form');
    if (!passInput || !form) return;

    if (form.dataset.avReset === '1') return;
    form.dataset.avReset = '1';

    // Medidor
    const medidor = crearMedidor('av-reset');
    const passWrap = passInput.closest('div') || passInput;
    passWrap.insertAdjacentElement('afterend', medidor);

    // Feedback correo
    if (emailInput) {
      const fbEmail = crearFeedback('av-reset-email-fb');
      const emailWrap = emailInput.closest('div') || emailInput;
      emailWrap.insertAdjacentElement('afterend', fbEmail);

      emailInput.addEventListener('input', () => {
        const ok = validarCorreo(emailInput.value);
        fbEmail.textContent = emailInput.value
          ? (ok ? '✓ Correo válido' : '✗ Ingresa un correo válido (ej: usuario@gmail.com)')
          : '';
        fbEmail.style.color = ok ? '#22c55e' : '#ef4444';
      });
    }

    passInput.addEventListener('input', () => {
      actualizarMedidor(passInput.value, 'av-reset');
    });

    // Validación al enviar
    form.addEventListener('submit', function (e) {
      const correo = emailInput ? emailInput.value.trim() : '';
      const pwd    = passInput.value;
      const { score } = analizarPassword(pwd);
      let error = null;

      if (emailInput && !validarCorreo(correo)) {
        error = 'El correo electrónico no es válido.';
      } else if (score < 3) {
        error = 'La contraseña es muy débil. Agrega mayúsculas, números o símbolos.';
      }

      if (error) {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (typeof showToast === 'function') showToast(error, 'error');
        else if (window.mostrarToast) window.mostrarToast(error, 'error');
      }
    }, true);
  }

  // ── Escuchar cuando Bootstrap muestra los modales ────────────────────
  // modal-3d.js transforma el DOM justo antes/durante el show,
  // así que escuchamos 'shown.bs.modal' (ya completamente visible y listo)

  function init() {
    inyectarCSS();

    const modalRegistro = document.getElementById('registroModal');
    const modalReset    = document.getElementById('resetModal');

    if (modalRegistro) {
      modalRegistro.addEventListener('shown.bs.modal', () => {
        configurarRegistro(modalRegistro);
      });
      // Si el modal ya está visible al cargar (raro pero posible)
      if (modalRegistro.classList.contains('show')) {
        configurarRegistro(modalRegistro);
      }
    }

    if (modalReset) {
      modalReset.addEventListener('shown.bs.modal', () => {
        configurarReset(modalReset);
      });
      if (modalReset.classList.contains('show')) {
        configurarReset(modalReset);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();