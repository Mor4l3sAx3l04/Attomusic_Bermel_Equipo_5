(function () {
  function initPanelAdmin() {
    if (window.animarTituloGlobal) {
      animarTituloGlobal('#titulo-siguiendo', 'Panel de Administrador');
      animarTituloGlobal('#pub-rep', 'Publicaciones Reportadas');
      animarTituloGlobal('#pub-t', 'Todas las Publicaciones');
      animarTituloGlobal('#gestion-usu', 'Gestión de Usuarios');
      animarTituloGlobal('#cuentas-el-titulo', 'Cuentas Eliminadas');
      animarTituloGlobal('#stats-titulo', 'Estadísticas del Sistema');
    }

    document.querySelectorAll('.modal').forEach(modal => {
      document.body.appendChild(modal);
    });

    const estadisticasTab = document.getElementById('estadisticas-tab');
    if (estadisticasTab && typeof cargarEstadisticas === 'function') {
      estadisticasTab.addEventListener('shown.bs.tab', cargarEstadisticas);
    }
  }

  window['init_panel-admin-init'] = initPanelAdmin;
  initPanelAdmin();
})();
