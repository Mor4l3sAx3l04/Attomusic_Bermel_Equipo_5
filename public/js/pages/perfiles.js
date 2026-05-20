(function () {
  function initPerfiles() {
    if (window.animarTituloGlobal) {
      animarTituloGlobal('#tp-populares', 'Perfiles Populares');
      animarTituloGlobal('#titulo-destacadas', 'Publicaciones Destacadas');
      animarTituloGlobal('#titulo-siguiendo', 'Siguiendo');
    }
  }

  window['init_perfiles'] = initPerfiles;
  initPerfiles();
})();
