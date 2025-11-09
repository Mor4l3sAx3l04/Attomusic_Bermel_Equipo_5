// publicacion.js
console.log("✅ publicacion.js cargado correctamente");

function inicializarPublicaciones() {
  const inputBuscar = document.getElementById("busquedaCancion");
  const botonBuscar = document.getElementById("buscarCancion");
  const resultados = document.getElementById("resultadoCanciones");
  const idCancionInput = document.getElementById("idCancionSeleccionada");
  const form = document.getElementById("formPublicacion");
  const mensaje = document.getElementById("mensajePub");
  const feed = document.getElementById("feedPublicaciones");

  // sanity checks con retry
  if (!inputBuscar || !botonBuscar || !resultados || !form) {
    console.warn("⚠️ Elementos no encontrados, reintentando en 200ms...");
    setTimeout(inicializarPublicaciones, 200);
    return;
  }

  console.log("🎵 Elementos del buscador listos.");

  // ===== Debounce para búsquedas mientras escribe =====
  let timeout = null;
  inputBuscar.addEventListener("input", () => {
    const q = inputBuscar.value.trim();
    clearTimeout(timeout);
    if (!q) {
      resultados.innerHTML = "";
      return;
    }
    timeout = setTimeout(() => buscarCanciones(q), 500);
  });

  // ===== Buscar al hacer clic =====
  botonBuscar.addEventListener("click", () => {
    const q = inputBuscar.value.trim();
    if (!q) {
      resultados.innerHTML = `<p style="color:#f8d7da">Escribe algo para buscar.</p>`;
      return;
    }
    buscarCanciones(q);
  });

  // ===== Función para buscar canciones =====
  async function buscarCanciones(query) {
    try {
      resultados.innerHTML = `<p style="color:#c9b6ff">Buscando "${escapeHtml(query)}" ...</p>`;

      const res = await fetch(`/spotify/search?q=${encodeURIComponent(query)}&type=track&limit=6`);
      if (!res.ok) {
        console.error("❌ Error al consultar /spotify/search:", res.status);
        resultados.innerHTML = `<p style="color:#f8d7da">Error al buscar canciones (status ${res.status})</p>`;
        return;
      }

      const data = await res.json();
      const items = data?.tracks?.items || [];

      if (!items.length) {
        resultados.innerHTML = `<p style="color:#f8d7da">No se encontraron canciones.</p>`;
        return;
      }

      resultados.innerHTML = "";
      items.forEach(track => {
        const div = document.createElement("div");
        div.className = "resultado-item d-flex align-items-center p-2 mb-2";
        div.style.cursor = "pointer";
        div.style.border = "1px solid rgba(255,255,255,0.06)";
        div.style.borderRadius = "10px";
        div.innerHTML = `
          <img src="${track.album?.images?.[1]?.url || track.album?.images?.[0]?.url || 'images/default-song.png'}"
              alt="cover" width="56" height="56" style="object-fit:cover;border-radius:8px;margin-right:10px;">
          <div style="flex:1">
            <strong style="color:#e6e0ff">${escapeHtml(track.name)}</strong>
            <div style="font-size:0.9rem;color:#cfcfe8">${escapeHtml(track.artists.map(a => a.name).join(", "))}</div>
            <div style="font-size:0.8rem;color:#bdb6d8;margin-top:4px">${escapeHtml(track.album?.name || '')}</div>
          </div>
          <div style="margin-left:10px;font-size:0.9rem;color:#bdb6d8">▶︎</div>
        `;

        div.addEventListener("click", () => {
          inputBuscar.value = `${track.name} - ${track.artists[0].name}`;
          idCancionInput.value = track.id;
          resultados.innerHTML = `<p style="color:#c9f7d3">Canción seleccionada: <strong>${escapeHtml(track.name)}</strong> — ${escapeHtml(track.artists[0].name)}</p>`;
        });

        resultados.appendChild(div);
      });

    } catch (error) {
      console.error("Error al buscar canciones:", error);
      resultados.innerHTML = `<p style="color:#f8d7da">Error al buscar canciones (ver consola).</p>`;
    }
  }

  // ===== Enviar publicación al backend =====
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const texto = document.getElementById("textoPublicacion").value.trim();
    const idCancion = idCancionInput.value || null;

    let usuarioLS = null;
    try { usuarioLS = JSON.parse(localStorage.getItem("usuario")); } catch (err) { /* noop */ }
    const correo = usuarioLS?.correo || usuarioLS?.usuario || localStorage.getItem("correoUsuario");

    if (!correo) {
      mensaje.textContent = "Debes iniciar sesión para publicar.";
      mensaje.style.color = "#f8d7da";
      return;
    }
    if (!texto) {
      alert("Escribe algo para publicar.");
      return;
    }

    const fechaHora = new Date().toISOString();

    try {
      const res = await fetch("/api/publicacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo, idCancion, publicacion: texto, fechaHora })
      });

      const data = await res.json();
      if (res.ok) {
        mensaje.textContent = data.message || "Publicación creada correctamente.";
        mensaje.style.color = "#c9f7d3";
        form.reset();
        idCancionInput.value = "";
        cargasPublicaciones();
      } else {
        mensaje.textContent = data.error || "Error al publicar.";
        mensaje.style.color = "#f8d7da";
        console.warn("Publicación falló:", data);
      }
    } catch (err) {
      console.error("Error al enviar publicación:", err);
      mensaje.textContent = "Error de conexión al publicar.";
      mensaje.style.color = "#f8d7da";
    }
  });

  // ===== Cargar publicaciones =====
  async function cargasPublicaciones() {
    if (!feed) return;
    try {
      const res = await fetch("/api/publicaciones");
      if (!res.ok) {
        console.error("/api/publicaciones status", res.status);
        feed.innerHTML = `<p style="color:#f8d7da">No se pudieron cargar publicaciones.</p>`;
        return;
      }

      const data = await res.json();
      feed.innerHTML = "";
      if (!Array.isArray(data) || data.length === 0) {
        feed.innerHTML = `<p style="color:#bdb6d8">Aún no hay publicaciones.</p>`;
        return;
      }

      data.forEach(pub => {
        const d = document.createElement("article");
        d.className = "bg-dark p-3 mb-3 border rounded";
        const fecha = new Date(pub.fecha_pub).toLocaleString();
        d.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center">
            <strong style="color:#e6e0ff">@${escapeHtml(pub.usuario)}</strong>
            <small style="color:#bdb6d8">${escapeHtml(fecha)}</small>
          </div>
          <p style="margin:10px 0;color:#ddd">${escapeHtml(pub.publicacion)}</p>
          ${pub.cancion ? `
            <div style="padding:8px;border-radius:10px;background:linear-gradient(160deg,#2b0d4a,#05243a);color:#c9f7d3">
              <strong>${escapeHtml(pub.cancion)}</strong> — ${escapeHtml(pub.artista || '')}
            </div>` : ""}
        `;
        feed.appendChild(d);
      });

    } catch (err) {
      console.error("Error cargando publicaciones:", err);
      feed.innerHTML = `<p style="color:#f8d7da">Error al cargar publicaciones.</p>`;
    }
  }

  // Utilidad para escapar HTML
  function escapeHtml(str) {
    if (!str && str !== 0) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // iniciar feed
  cargasPublicaciones();
}

// ✅ Ejecutar inicialización (con soporte para carga dinámica)
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", inicializarPublicaciones);
} else {
  // Ya está cargado, ejecutar con delay
  setTimeout(inicializarPublicaciones, 100);
}