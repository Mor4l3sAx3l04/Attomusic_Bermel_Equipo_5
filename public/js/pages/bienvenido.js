(function () {
  function initBienvenido() {
    if (window.animarTituloGlobal) {
      animarTituloGlobal('#titulo-noticias', 'Últimas Publicaciones');
    }

    const inputBuscador = document.getElementById('inputBuscador');
    const btnLimpiar    = document.getElementById('btnLimpiar');
    const iconSearch    = document.getElementById('lordIconSearch');

    if (!inputBuscador) return;

    let timeoutBusqueda = null;

    if (iconSearch) {
      iconSearch.addEventListener('click', () => {
        const query = inputBuscador.value.trim();
        if (query.length > 0) window.buscarPublicaciones(query);
        else inputBuscador.focus();
      });
    }

    inputBuscador.addEventListener('input', function (e) {
      const query = e.target.value.trim();
      btnLimpiar.style.display = query.length > 0 ? 'block' : 'none';

      clearTimeout(timeoutBusqueda);
      timeoutBusqueda = setTimeout(() => {
        if (query.length > 0) window.buscarPublicaciones(query);
        else window.cargarPublicaciones();
      }, 500);
    });

    btnLimpiar.addEventListener('click', function () {
      inputBuscador.value = '';
      btnLimpiar.style.display = 'none';
      window.cargarPublicaciones();
    });

    inputBuscador.addEventListener('keypress', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        const query = e.target.value.trim();
        if (query.length > 0) window.buscarPublicaciones(query);
      }
    });
  }

  window['init_bienvenido'] = initBienvenido;
  initBienvenido();
})();
