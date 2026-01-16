// public/js/detalleCancion.js
// Módulo reutilizable para mostrar detalles de canciones

const DetalleCancion = (function() {
  
  // Configuración
  const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000' 
    : 'https://attomusic.onrender.com';

  // Estado interno
  let currentUserEmail = null;

  // Inicializar con datos del usuario (llamar al cargar la página)
  function init(userEmail) {
    currentUserEmail = userEmail;
  }

  // Obtener email del usuario (de sessionStorage o como lo manejes)
  function getUserEmail() {
    if (currentUserEmail) return currentUserEmail;
    return sessionStorage.getItem('userEmail') || sessionStorage.getItem('correo') || null;
  }

 
  // CREAR ESTRELLAS
 
  function crearEstrellas(calificacionActual = 0) {
    return `
      <div class="star-rating" style="display:flex;gap:8px;justify-content:flex-start;align-items:center;margin:12px 0;">
        ${[1, 2, 3, 4, 5].map(val => `
          <span class="star" data-value="${val}" style="font-size:2rem;cursor:pointer;color:${val <= calificacionActual ? '#ba01ff' : '#ddd'};transition:color 0.2s;">★</span>
        `).join('')}
      </div>
      <input type="hidden" id="calificacion" value="${calificacionActual}">
    `;
  }

 
  // ACTIVAR INTERACTIVIDAD DE ESTRELLAS
 
  function activarEstrellas() {
    const stars = document.querySelectorAll('.star');
    const inputCalificacion = document.getElementById('calificacion');
    let selectedRating = parseInt(inputCalificacion.value) || 0;

    stars.forEach(star => {
      star.addEventListener('mouseenter', function() {
        const value = parseInt(this.getAttribute('data-value'));
        stars.forEach((s, idx) => {
          if (idx < value) {
            s.style.color = '#ffd700';
          } else {
            s.style.color = selectedRating > idx ? '#ba01ff' : '#ddd';
          }
        });
      });

      star.addEventListener('click', function() {
        selectedRating = parseInt(this.getAttribute('data-value'));
        inputCalificacion.value = selectedRating;
        stars.forEach((s, idx) => {
          s.style.color = idx < selectedRating ? '#ba01ff' : '#ddd';
        });
      });
    });

    const starRating = document.querySelector('.star-rating');
    if (starRating) {
      starRating.addEventListener('mouseleave', function() {
        stars.forEach((s, idx) => {
          s.style.color = idx < selectedRating ? '#ba01ff' : '#ddd';
        });
      });
    }
  }

 
  // CARGAR CALIFICACIONES
 
  async function cargarCalificaciones(idCancion) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/canciones/${idCancion}/calificaciones`);
      if (!response.ok) throw new Error('Error al cargar calificaciones');
      return await response.json();
    } catch (error) {
      console.error('Error cargando calificaciones:', error);
      return { promedio: 0, total: 0, distribucion: [] };
    }
  }

 
  // CARGAR CALIFICACIÓN DEL USUARIO
 
  async function cargarCalificacionUsuario(idCancion) {
    const userEmail = getUserEmail();
    if (!userEmail) return null;

    try {
      const response = await fetch(`${API_BASE_URL}/api/canciones/${idCancion}/calificaciones/usuario?correo=${encodeURIComponent(userEmail)}`);
      if (!response.ok) return null;
      const data = await response.json();
      return data.calificacion;
    } catch (error) {
      console.error('Error cargando calificación del usuario:', error);
      return null;
    }
  }

 
  // GUARDAR CALIFICACIÓN
 
  async function guardarCalificacion(idCancion, calificacion) {
    const userEmail = getUserEmail();
    if (!userEmail) {
      return { success: false, error: 'Debes iniciar sesión para calificar' };
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/canciones/${idCancion}/calificaciones`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ calificacion, correo: userEmail })
      });

      const data = await response.json();
      
      if (!response.ok) {
        return { success: false, error: data.error || 'Error al guardar calificación' };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error guardando calificación:', error);
      return { success: false, error: 'Error de conexión' };
    }
  }

 
  // CARGAR COMENTARIOS
 
  async function cargarComentarios(idCancion, limit = 20, offset = 0) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/canciones/${idCancion}/comentarios?limit=${limit}&offset=${offset}`);
      if (!response.ok) throw new Error('Error al cargar comentarios');
      return await response.json();
    } catch (error) {
      console.error('Error cargando comentarios:', error);
      return { comentarios: [], total: 0 };
    }
  }

 
  // GUARDAR COMENTARIO
 
  async function guardarComentario(idCancion, comentario) {
    const userEmail = getUserEmail();
    if (!userEmail) {
      return { success: false, error: 'Debes iniciar sesión para comentar' };
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/canciones/${idCancion}/comentarios`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ comentario, correo: userEmail })
      });

      const data = await response.json();
      
      if (!response.ok) {
        return { success: false, error: data.error || 'Error al guardar comentario' };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error guardando comentario:', error);
      return { success: false, error: 'Error de conexión' };
    }
  }

 
  // RENDERIZAR COMENTARIOS
 
  function renderizarComentarios(comentarios) {
    if (comentarios.length === 0) {
      return '<p style="color:#999;text-align:center;padding:20px;">Aún no hay comentarios. ¡Sé el primero en comentar!</p>';
    }

    return comentarios.map(c => {
      const fecha = new Date(c.fecha_creacion).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const fotoPerfil = c.foto_perfil || 'images/icono.png';

      return `
        <div class="comentario-item" style="background:#f9f9f9;border-radius:12px;padding:16px;margin-bottom:12px;">
          <div style="display:flex;gap:12px;align-items:start;">
            <img src="${fotoPerfil}" alt="${c.nombre}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;">
            <div style="flex:1;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <strong style="color:#5a189a;">${c.nombre}</strong>
                <span style="color:#999;font-size:0.85rem;">${fecha}</span>
              </div>
              <p style="color:#333;margin:0;white-space:pre-wrap;">${c.comentario}</p>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // MOSTRAR DETALLE DE CANCIÓN
  async function mostrar(idCancion, containerElement, onVolverCallback) {
    const container = typeof containerElement === 'string' 
      ? document.getElementById(containerElement) 
      : containerElement;

    if (!container) {
      console.error('Container no encontrado');
      return;
    }

    // Mostrar loading
    container.innerHTML = `
      <div style='text-align:center;color:#5a189a;font-size:1.5rem;padding:40px;'>
        <div class="spinner-border" role="status"></div>
        <p style="margin-top:16px;">Cargando detalles...</p>
      </div>
    `;

    try {
      // Cargar datos en paralelo
      const [trackResponse, calificaciones, calificacionUsuario, comentariosData] = await Promise.all([
        fetch(`${API_BASE_URL}/spotify/track/${idCancion}`),
        cargarCalificaciones(idCancion),
        cargarCalificacionUsuario(idCancion),
        cargarComentarios(idCancion, 20, 0)
      ]);

      if (!trackResponse.ok) throw new Error('Error al cargar canción');
      const track = await trackResponse.json();

      const img = track.album?.images?.[0]?.url || "";
      const promedioEstrellas = Math.round(calificaciones.promedio);

      // Renderizar vista
      container.innerHTML = `
        <button id='volver-btn-detalle' class='btn' style='margin-bottom:24px;background:linear-gradient(160deg,#ba01ff,#00dffc);color:white;border:none;font-weight:700;padding:10px 24px;border-radius:12px;'>⟵ Volver</button>
        
        <div id='detalle-container' style='display:grid;grid-template-columns:300px 1fr;gap:32px;align-items:start;background:linear-gradient(135deg,#f3e8ff 0%,#e0f7ff 100%);padding:32px;border-radius:18px;box-shadow:0 4px 20px rgba(90,24,154,0.15);'>
          
          <div style='display:flex;flex-direction:column;align-items:center;'>
            ${img ? `<img src='${img}' alt='cover' style='width:100%;max-width:280px;height:auto;border-radius:18px;margin-bottom:18px;box-shadow:0 8px 24px rgba(90,24,154,0.2);'>` : ""}
            
            <!-- Promedio de calificación -->
            <div style='text-align:center;margin-top:12px;padding:16px;background:white;border-radius:12px;width:100%;'>
              <p style='color:#999;font-size:0.9rem;margin:0 0 8px 0;'>Calificación promedio</p>
              <div style='font-size:2.5rem;color:#ba01ff;margin-bottom:4px;'>
                ${[1, 2, 3, 4, 5].map(val => `<span style='color:${val <= promedioEstrellas ? '#ba01ff' : '#ddd'}'>★</span>`).join('')}
              </div>
              <p style='color:#5a189a;font-weight:700;margin:0;'>${calificaciones.promedio.toFixed(1)} / 5.0</p>
              <p style='color:#999;font-size:0.85rem;margin:4px 0 0 0;'>(${calificaciones.total} ${calificaciones.total === 1 ? 'calificación' : 'calificaciones'})</p>
            </div>
          </div>
          
          <div style='display:flex;flex-direction:column;gap:16px;'>
            <h1 class='detalle-title' style='color:#5a189a;font-size:2.5rem;font-weight:900;margin:0;'>${track.name}</h1>
            
            <div style='display:flex;flex-wrap:wrap;gap:24px;'>
              <p class='detalle-text' style='color:#ba01ff;font-weight:700;font-size:1.2rem;margin:0;'>👩‍🎤 ${track.artists.map(a => a.name).join(", ")}</p>
              <p class='detalle-text' style='color:#5a189a;font-size:1.1rem;margin:0;'>💿 ${track.album?.name || ""}</p>
            </div>
            
            <div style='display:flex;flex-wrap:wrap;gap:24px;'>
              <p class='detalle-text' style='color:#5a189a;font-size:1.1rem;margin:0;'>📅 ${track.album?.release_date || ""}</p>
              <p class='detalle-text' style='color:#ff9100;font-size:1.1rem;margin:0;'>🔥 Popularidad: ${track.popularity}</p>
            </div>
            
            <!-- Sección de Calificación -->
            <div class='detalle-section' style='margin-top:24px;padding:24px;background:white;border-radius:12px;box-shadow:0 2px 12px rgba(90,24,154,0.08);'>
              <h4 style='color:#ba01ff;margin-bottom:16px;font-size:1.3rem;'>Tu calificación</h4>
              <form id='calificar-form-detalle'>
                ${crearEstrellas(calificacionUsuario || 0)}
                <button type='submit' class='btn' style='margin-top:10px;background:linear-gradient(160deg,#ba01ff,#00dffc);border:none;color:white;padding:8px 24px;border-radius:8px;font-weight:600;'>Guardar calificación</button>
              </form>
              <div id='calificacion-result' style='margin-top:12px;'></div>
            </div>
            
            <!-- Sección de Comentarios -->
            <div class='detalle-section' style='margin-top:16px;padding:24px;background:white;border-radius:12px;box-shadow:0 2px 12px rgba(90,24,154,0.08);'>
              <h4 style='color:#5a189a;margin-bottom:16px;font-size:1.3rem;'>Comentarios (${comentariosData.total})</h4>
              
              <!-- Formulario para nuevo comentario -->
              <form id='comentario-form-detalle' style='margin-bottom:24px;'>
                <textarea id='comentario-textarea' rows='3' required class='detalle-textarea' placeholder='Escribe tu comentario...' style='width:100%;border-radius:8px;border:1px solid #5a189a;padding:12px;font-size:1rem;resize:vertical;'></textarea>
                <button type='submit' class='btn' style='margin-top:10px;background:linear-gradient(160deg,#5a189a,#00dffc);border:none;width:100%;color:white;padding:10px;border-radius:8px;font-weight:600;'>Enviar comentario</button>
              </form>
              <div id='comentario-result' style='margin-bottom:16px;'></div>
              
              <!-- Lista de comentarios -->
              <div id='comentarios-lista'>
                ${renderizarComentarios(comentariosData.comentarios)}
              </div>
              
              ${comentariosData.total > 20 ? `
                <button id='cargar-mas-comentarios' class='btn' style='margin-top:16px;background:#f3e8ff;color:#5a189a;border:1px solid #ba01ff;width:100%;padding:10px;border-radius:8px;font-weight:600;'>
                  Cargar más comentarios
                </button>
              ` : ''}
            </div>
            
          </div>
        </div>
        
        <style>
          [data-bs-theme="dark"] #detalle-container {
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%) !important;
          }
          
          [data-bs-theme="dark"] .detalle-title {
            color: #b983ff !important;
          }
          
          [data-bs-theme="dark"] .detalle-text {
            color: #e0e0e0 !important;
          }
          
          [data-bs-theme="dark"] .detalle-section {
            background: #23272f !important;
          }
          
          [data-bs-theme="dark"] .detalle-section h4 {
            color: #b983ff !important;
          }
          
          [data-bs-theme="dark"] .detalle-textarea {
            background: #1a1a2e !important;
            color: #e0e0e0 !important;
            border-color: #b983ff !important;
          }
          
          [data-bs-theme="dark"] .comentario-item {
            background: #1a1a2e !important;
            color: #e0e0e0 !important;
          }
          
          [data-bs-theme="dark"] .comentario-item strong {
            color: #b983ff !important;
          }
          
          [data-bs-theme="dark"] .comentario-item p {
            color: #e0e0e0 !important;
          }
          
          @media (max-width: 768px) {
            #detalle-container {
              grid-template-columns: 1fr !important;
              text-align: center;
            }
            .star-rating {
              justify-content: center !important;
            }
          }
        </style>
      `;

      // Activar interactividad de estrellas
      activarEstrellas();

      // Event Listener: Volver
      document.getElementById('volver-btn-detalle').onclick = () => {
        if (typeof onVolverCallback === 'function') {
          onVolverCallback();
        }
      };

      // Event Listener: Guardar calificación
      document.getElementById('calificar-form-detalle').addEventListener('submit', async function(e) {
        e.preventDefault();
        const cal = parseInt(document.getElementById('calificacion').value);
        
        if (cal < 1 || cal > 5) {
          document.getElementById('calificacion-result').innerHTML = 
            `<p style='color:#ff0000;'>Por favor selecciona una calificación</p>`;
          return;
        }

        const resultDiv = document.getElementById('calificacion-result');
        resultDiv.innerHTML = `<p style='color:#999;'>Guardando...</p>`;

        const result = await guardarCalificacion(idCancion, cal);
        
        if (result.success) {
          resultDiv.innerHTML = 
            `<p style='color:#5a189a;'>✅ ¡Gracias! Calificaste esta canción con <b>${cal}</b> estrella${cal > 1 ? 's' : ''}.</p>`;
          
          // Recargar calificaciones promedio
          setTimeout(async () => {
            const newCalificaciones = await cargarCalificaciones(idCancion);
            const promedioDiv = container.querySelector('[style*="Calificación promedio"]').parentElement;
            const newPromedioEstrellas = Math.round(newCalificaciones.promedio);
            
            promedioDiv.innerHTML = `
              <p style='color:#999;font-size:0.9rem;margin:0 0 8px 0;'>Calificación promedio</p>
              <div style='font-size:2.5rem;color:#ba01ff;margin-bottom:4px;'>
                ${[1, 2, 3, 4, 5].map(val => `<span style='color:${val <= newPromedioEstrellas ? '#ba01ff' : '#ddd'}'>★</span>`).join('')}
              </div>
              <p style='color:#5a189a;font-weight:700;margin:0;'>${newCalificaciones.promedio.toFixed(1)} / 5.0</p>
              <p style='color:#999;font-size:0.85rem;margin:4px 0 0 0;'>(${newCalificaciones.total} ${newCalificaciones.total === 1 ? 'calificación' : 'calificaciones'})</p>
            `;
          }, 500);
        } else {
          resultDiv.innerHTML = 
            `<p style='color:#ff0000;'>❌ ${result.error}</p>`;
        }
      });

      // Event Listener: Enviar comentario
      document.getElementById('comentario-form-detalle').addEventListener('submit', async function(e) {
        e.preventDefault();
        const comentario = document.getElementById('comentario-textarea').value.trim();
        
        if (!comentario) return;

        const resultDiv = document.getElementById('comentario-result');
        resultDiv.innerHTML = `<p style='color:#999;'>Enviando...</p>`;

        const result = await guardarComentario(idCancion, comentario);
        
        if (result.success) {
          resultDiv.innerHTML = 
            `<p style='color:#5a189a;'>✅ ¡Comentario agregado exitosamente!</p>`;
          document.getElementById('comentario-textarea').value = '';
          
          // Recargar comentarios
          setTimeout(async () => {
            const newComentarios = await cargarComentarios(idCancion, 20, 0);
            document.getElementById('comentarios-lista').innerHTML = 
              renderizarComentarios(newComentarios.comentarios);
            
            // Actualizar contador
            const h4 = container.querySelector('.detalle-section h4');
            if (h4 && h4.textContent.includes('Comentarios')) {
              h4.textContent = `Comentarios (${newComentarios.total})`;
            }
            
            resultDiv.innerHTML = '';
          }, 1000);
        } else {
          resultDiv.innerHTML = 
            `<p style='color:#ff0000;'>❌ ${result.error}</p>`;
        }
      });

    } catch (error) {
      console.error('Error mostrando detalle:', error);
      container.innerHTML = `
        <div style='text-align:center;color:#ff5555;padding:40px;'>
          <p style='font-size:1.5rem;margin-bottom:16px;'>❌ Error al cargar detalles</p>
          <p>Por favor, intenta de nuevo más tarde.</p>
          <button onclick='location.reload()' class='btn' style='margin-top:24px;background:#ba01ff;color:white;border:none;padding:10px 24px;border-radius:8px;'>
            Recargar página
          </button>
        </div>
      `;
    }
  }

  // API pública del módulo
  return {
    init,
    mostrar,
    crearEstrellas,
    activarEstrellas
  };
})();

// Hacer disponible globalmente
window.DetalleCancion = DetalleCancion;