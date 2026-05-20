(function () {
  function initPerfil() {
    document.querySelectorAll('.modal').forEach(modal => {
      document.body.appendChild(modal);
    });

    if (window.cargarPerfil) window.cargarPerfil();
    if (window.inicializarPerfil) window.inicializarPerfil();
  }

  window.previewImage = function (input, previewId) {
    const file = input.files[0];
    const preview = document.getElementById(previewId);
    if (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        preview.src = e.target.result;
        preview.style.display = 'block';
      };
      reader.readAsDataURL(file);
    }
  };

  let _modalEliminar = null;

  window.abrirModalEliminarCuenta = function () {
    document.getElementById('eliminarContrasena').value = '';
    document.getElementById('eliminarMotivo').value = '';
    if (!_modalEliminar) {
      _modalEliminar = new bootstrap.Modal(document.getElementById('modalEliminarCuenta'));
    }
    _modalEliminar.show();
  };

  window.confirmarEliminarCuenta = async function () {
    const contrasena = document.getElementById('eliminarContrasena').value.trim();
    const motivo     = document.getElementById('eliminarMotivo').value.trim();
    const btn        = document.getElementById('btnConfirmarEliminar');

    if (!contrasena) { window.mostrarToast('Debes ingresar tu contraseña', 'error'); return; }
    if (!motivo)     { window.mostrarToast('El motivo es obligatorio', 'error'); return; }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Eliminando...';

    try {
      const usuario = window.getUsuarioActual();
      if (!usuario) {
        window.mostrarToast('No hay sesión activa', 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-trash3"></i> Sí, eliminar';
        return;
      }

      const res = await fetch('/api/eliminar-cuenta', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: usuario.correo, contrasena, motivo })
      });
      const data = await res.json();

      if (res.ok) {
        localStorage.removeItem('usuario');
        sessionStorage.clear();
        if (_modalEliminar) _modalEliminar.hide();
        window.mostrarToast('Tu cuenta fue eliminada. ¡Hasta luego!', 'success');
        setTimeout(() => { loadPage('bienvenido.html'); }, 2200);
      } else {
        window.mostrarToast(data.message || 'Error al eliminar la cuenta', 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-trash3"></i> Sí, eliminar';
      }
    } catch (err) {
      console.error('Error eliminando cuenta:', err);
      window.mostrarToast('Error de conexión', 'error');
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-trash3"></i> Sí, eliminar';
    }
  };

  window['init_perfil'] = initPerfil;
  initPerfil();
})();
