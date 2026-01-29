// ===== CURSOR CON NOTAS MUSICALES - ATTOMUSIC =====

(function() {
  'use strict';

  // Solo activar en desktop
  if (window.innerWidth <= 768) {
    return;
  }

  // Variables
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  let particles = [];
  let mouseX = 0;
  let mouseY = 0;
  let isMouseMoving = false;
  let mouseTimeout;
  let isEnabled = true; // Estado del cursor musical
  let animationId = null;

  // Cargar preferencia guardada
  const savedPreference = localStorage.getItem('cursorMusicEnabled');
  if (savedPreference !== null) {
    isEnabled = savedPreference === 'true';
  }

  // Notas musicales disponibles
  const musicalNotes = ['♪', '♫', '♬', '♩', '♭', '♮', '♯', '𝄞'];

  // Colores del gradiente AttoMusic
  const colors = ['#ba01ff', '#00dffc', '#7b2cbf', '#00e5ff', '#9d4edd'];

  // Configuración
  const config = {
    particleCount: 3,
    particleLife: 60,
    particleSize: 24,
    velocityRange: 2,
    fadeSpeed: 0.02
  };

  // Clase Partícula (Nota Musical)
  class MusicNote {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.note = musicalNotes[Math.floor(Math.random() * musicalNotes.length)];
      this.color = colors[Math.floor(Math.random() * colors.length)];
      this.size = config.particleSize + Math.random() * 10;
      this.life = config.particleLife;
      this.maxLife = config.particleLife;
      this.velocityX = (Math.random() - 0.5) * config.velocityRange;
      this.velocityY = -Math.random() * config.velocityRange - 1;
      this.rotation = Math.random() * Math.PI * 2;
      this.rotationSpeed = (Math.random() - 0.5) * 0.1;
      this.opacity = 1;
    }

    update() {
      this.x += this.velocityX;
      this.y += this.velocityY;
      this.rotation += this.rotationSpeed;
      this.life--;
      this.opacity = this.life / this.maxLife;
      
      // Agregar gravedad suave
      this.velocityY += 0.05;
    }

    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      ctx.globalAlpha = this.opacity;
      
      // Sombra brillante
      ctx.shadowBlur = 15;
      ctx.shadowColor = this.color;
      
      // Dibujar nota
      ctx.font = `${this.size}px Arial`;
      ctx.fillStyle = this.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.note, 0, 0);
      
      ctx.restore();
    }

    isDead() {
      return this.life <= 0;
    }
  }

  // Inicializar canvas
  function initCanvas() {
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '9999';
    canvas.style.display = isEnabled ? 'block' : 'none';
    document.body.appendChild(canvas);
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  }

  // Redimensionar canvas
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  // Crear partículas
  function createParticles(x, y) {
    if (!isEnabled) return;
    
    for (let i = 0; i < config.particleCount; i++) {
      particles.push(new MusicNote(x, y));
    }
  }

  // Actualizar y dibujar
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (isEnabled) {
      // Actualizar partículas
      particles.forEach((particle, index) => {
        particle.update();
        particle.draw();
        
        if (particle.isDead()) {
          particles.splice(index, 1);
        }
      });
    } else {
      // Si está deshabilitado, limpiar partículas
      particles = [];
    }
    
    animationId = requestAnimationFrame(animate);
  }

  // Event listeners del mouse
  function handleMouseMove(e) {
    if (!isEnabled) return;
    
    mouseX = e.clientX;
    mouseY = e.clientY;
    
    if (!isMouseMoving) {
      isMouseMoving = true;
    }
    
    // Crear partículas mientras el mouse se mueve
    if (Math.random() > 0.7) { // Control de frecuencia
      createParticles(mouseX, mouseY);
    }
    
    // Resetear timeout
    clearTimeout(mouseTimeout);
    mouseTimeout = setTimeout(() => {
      isMouseMoving = false;
    }, 100);
  }

  // Efecto especial en clicks
  function handleClick(e) {
    if (!isEnabled) return;
    
    const x = e.clientX;
    const y = e.clientY;
    
    // Burst de notas
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        createParticles(x, y);
      }, i * 30);
    }
  }

  // Función pública para toggle
  window.toggleCursorMusic = function() {
    isEnabled = !isEnabled;
    canvas.style.display = isEnabled ? 'block' : 'none';
    localStorage.setItem('cursorMusicEnabled', isEnabled);
    
    // Actualizar icono del botón si existe
    const btn = document.getElementById('btn-cursor-music');
    if (btn) {
      const icon = btn.querySelector('i');
      if (icon) {
        if (isEnabled) {
          icon.className = 'bi bi-music-note-beamed';
          btn.title = 'Desactivar cursor musical';
        } else {
          icon.className = 'bi bi-music-note';
          btn.title = 'Activar cursor musical';
        }
      }
    }
    
    console.log('🎵 Cursor musical:', isEnabled ? 'ACTIVADO' : 'DESACTIVADO');
    return isEnabled;
  };

  // Obtener estado actual
  window.getCursorMusicStatus = function() {
    return isEnabled;
  };

  // Inicializar
  function init() {
    initCanvas();
    animate();
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('click', handleClick);
    
    console.log('🎵 Cursor musical inicializado -', isEnabled ? 'ACTIVADO' : 'DESACTIVADO');
  }

  // Desactivar si cambia a móvil
  window.addEventListener('resize', () => {
    if (window.innerWidth <= 768 && canvas.parentNode) {
      canvas.remove();
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleClick);
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      console.log('🎵 Cursor musical desactivado (móvil)');
    } else if (window.innerWidth > 768 && !canvas.parentNode) {
      init();
    }
  });

  // Ejecutar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();