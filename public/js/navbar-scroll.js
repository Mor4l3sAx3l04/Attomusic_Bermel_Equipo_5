// ===== EFECTO SCROLL PARA NAVBAR =====

(function() {
  'use strict';

  const navbar = document.querySelector('.navbar');
  let lastScroll = 0;

  function handleScroll() {
    const currentScroll = window.pageYOffset;

    // Agregar clase "scrolled" cuando bajes
    if (currentScroll > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }

    lastScroll = currentScroll;
  }

  // Escuchar scroll
  window.addEventListener('scroll', handleScroll);

  // Ejecutar una vez al cargar
  handleScroll();

})();