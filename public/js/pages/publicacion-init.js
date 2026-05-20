(function () {
  function initPublicacionPage() {
    if (window.animarTituloGlobal) {
      animarTituloGlobal('#titulo-siguiendo', 'Crear Nueva Publicación');
    }
  }

  window['init_publicacion-init'] = initPublicacionPage;
  initPublicacionPage();
})();
