// js/mobile-menu-fix.js
// Script para cerrar el menú móvil automáticamente

document.addEventListener('DOMContentLoaded', function() {
  
  const navbarCollapse = document.getElementById('navbarNav');
  const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
  const bsCollapse = bootstrap.Collapse.getInstance(navbarCollapse) || new bootstrap.Collapse(navbarCollapse, { toggle: false });

  // 1️⃣ CERRAR MENÚ AL HACER CLICK EN UN ENLACE (excepto dropdown)
  navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      // ✅ NO CERRAR si es un dropdown toggle (perfil)
      if (this.classList.contains('dropdown-toggle')) {
        return; // Dejar que el dropdown funcione normalmente
      }

      // Si es un enlace que carga página o modal, cerrar el menú
      if (this.classList.contains('load-page') || 
          this.hasAttribute('data-bs-toggle') ||
          this.getAttribute('href') !== '#') {
        
        // Cerrar el menú con animación de Bootstrap
        if (navbarCollapse.classList.contains('show')) {
          bsCollapse.hide();
        }
      }
    });
  });

  // ✅ CERRAR MENÚ AL HACER BÚSQUEDA
  const searchBtn = document.getElementById('searchBtn');
  const searchInput = document.getElementById('searchInput');

  if (searchBtn) {
    searchBtn.addEventListener('click', function() {
      // Si se va a hacer búsqueda, cerrar menú
      const query = searchInput.value.trim();
      if (query && navbarCollapse.classList.contains('show')) {
        bsCollapse.hide();
      }
    });
  }

  if (searchInput) {
    searchInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        const query = this.value.trim();
        if (query && navbarCollapse.classList.contains('show')) {
          // Pequeño delay para que se ejecute la búsqueda primero
          setTimeout(() => {
            bsCollapse.hide();
          }, 100);
        }
      }
    });
  }

  // 2️⃣ CERRAR MENÚ AL HACER CLICK FUERA (en el backdrop)
  document.addEventListener('click', function(event) {
    const navbar = document.querySelector('.navbar');
    const navbarToggler = document.querySelector('.navbar-toggler');
    
    // Si el menú está abierto
    if (navbarCollapse.classList.contains('show')) {
      // ✅ NO CERRAR si el click fue en el dropdown del perfil o sus items
      const dropdownMenu = event.target.closest('.dropdown-menu');
      const dropdownToggle = event.target.closest('.dropdown-toggle');
      
      if (dropdownMenu || dropdownToggle) {
        return; // No cerrar el navbar si están interactuando con el dropdown
      }

      // Si el click NO fue dentro del navbar ni en el botón toggler
      if (!navbar.contains(event.target) && !navbarToggler.contains(event.target)) {
        bsCollapse.hide();
      }
    }
  });

  // 3️⃣ CERRAR MENÚ AL PRESIONAR ESC
  document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape' && navbarCollapse.classList.contains('show')) {
      bsCollapse.hide();
    }
  });

  // 4️⃣ PREVENIR SCROLL DEL BODY CUANDO EL MENÚ ESTÁ ABIERTO
  navbarCollapse.addEventListener('show.bs.collapse', function() {
    if (window.innerWidth < 992) { // Solo en móvil
      document.body.style.overflow = 'hidden';
    }
  });

  navbarCollapse.addEventListener('hidden.bs.collapse', function() {
    document.body.style.overflow = '';
  });

  // 5️⃣ CERRAR MENÚ CUANDO SE CAMBIA A VISTA DESKTOP
  window.addEventListener('resize', function() {
    if (window.innerWidth >= 992 && navbarCollapse.classList.contains('show')) {
      bsCollapse.hide();
      document.body.style.overflow = '';
    }
  }); 

  // ✅ CERRAR MENÚ AL HACER CLICK EN ITEMS DEL DROPDOWN DEL PERFIL
const dropdownItems = document.querySelectorAll('#perfil-container .dropdown-item');
dropdownItems.forEach(item => {
  item.addEventListener('click', function() {
    console.log('Click en dropdown item:', this.textContent.trim());
    // Cerrar el menú móvil si está abierto
    if (navbarCollapse.classList.contains('show')) {
      setTimeout(() => {
        bsCollapse.hide();
      }, 100); // Pequeño delay para que se ejecute la acción primero
    }
  });
});

  console.log('✅ Mobile menu fix cargado');
});