(function () {
  const PAGE_SIZE = 6;

  const topicLabels = {
    "musica-general": "Musica general",
    "musica-pop": "Pop",
    "musica-rock": "Rock",
    "musica-reggaeton": "Reggaeton y urbano",
    "musica-regional": "Regional mexicano",
    "musica-electronica": "Electronica y festivales",
    "musica-cantantes": "Cantantes y artistas",
    "musica-conciertos": "Proximos conciertos",
    cine: "Cine",
    entretenimiento: "Entretenimiento",
    general: "Noticias en general",
    tecnologia: "Tecnologia",
    ciencia: "Ciencia",
    salud: "Salud",
    deportes: "Deportes",
    negocios: "Negocios"
  };

  let temaActual = "musica-general";
  let paginaActual = 1;
  let articulos = [];
  let totalResults = 0;
  let cargando = false;

  function escapeHtml(value) {
    if (!value && value !== 0) return "";
    const div = document.createElement("div");
    div.textContent = String(value);
    return div.innerHTML;
  }

  function getElementos() {
    return {
      contenedor: document.querySelector(".container-noticias"),
      estado: document.getElementById("noticiasEstado"),
      select: document.getElementById("selectTipoNoticias")
    };
  }

  function setEstado(mensaje, tipo = "info") {
    const { estado } = getElementos();
    if (!estado) return;
    estado.className = `news-state ${tipo}`;
    estado.innerHTML = mensaje || "";
  }

  function getPlaceholder(label) {
    return `https://placehold.co/640x360/141827/ffffff?text=${encodeURIComponent(label || "AttoMusic")}`;
  }

  async function fetchNoticias({ append = false } = {}) {
    if (cargando) return;
    cargando = true;

    const { contenedor } = getElementos();
    if (!contenedor) return;

    if (!append) {
      paginaActual = 1;
      articulos = [];
      totalResults = 0;
      contenedor.innerHTML = "";
    }

    const label = topicLabels[temaActual] || "Noticias";
    setEstado(`<span class="spinner-border spinner-border-sm"></span> Cargando ${escapeHtml(label)}...`, "loading");

    try {
      const res = await fetch(`/music-news?topic=${encodeURIComponent(temaActual)}&page=${paginaActual}`);
      const data = await res.json();

      if (!res.ok || data.status === "error") {
        throw new Error(data.message || data.error || "No se pudieron cargar las noticias.");
      }

      const nuevas = Array.isArray(data.articles) ? data.articles : [];
      totalResults = Number(data.totalResults) || nuevas.length;
      articulos = append ? articulos.concat(nuevas) : nuevas;
      displayNoticias();
    } catch (error) {
      displayError(error.message || "No se pudieron cargar las noticias.");
    } finally {
      cargando = false;
    }
  }

  function displayNoticias() {
    const { contenedor } = getElementos();
    if (!contenedor) return;

    const label = topicLabels[temaActual] || "Noticias";
    contenedor.innerHTML = "";

    if (!articulos.length) {
      setEstado("", "info");
      contenedor.innerHTML = `
        <div class="news-empty">
          <i class="bi bi-newspaper"></i>
          <p>No hay noticias disponibles para ${escapeHtml(label)}.</p>
        </div>
      `;
      return;
    }

    setEstado(`<strong>${escapeHtml(label)}</strong> · ${articulos.length} noticia${articulos.length === 1 ? "" : "s"} cargada${articulos.length === 1 ? "" : "s"}.`, "success");

    const grid = document.createElement("div");
    grid.className = "news-grid";

    articulos.forEach((articulo) => {
      grid.appendChild(crearTarjetaNoticia(articulo, label));
    });

    contenedor.appendChild(grid);

    const hayMas = articulos.length < totalResults && articulos.length >= PAGE_SIZE;
    if (hayMas) {
      const btnSiguiente = document.createElement("button");
      btnSiguiente.type = "button";
      btnSiguiente.id = "btnSiguiente";
      btnSiguiente.className = "btn btn-outline-primary news-more-btn";
      btnSiguiente.innerHTML = '<i class="bi bi-plus-lg"></i> Ver mas';
      btnSiguiente.addEventListener("click", siguiente);
      contenedor.appendChild(btnSiguiente);
    }
  }

  function crearTarjetaNoticia(articulo, label) {
    const title = articulo.title || "Sin titulo";
    const img = articulo.urlToImage || getPlaceholder(label);
    const desc = articulo.description || articulo.content || "";
    const url = articulo.url || "#";
    const fuente = articulo.source && articulo.source.name ? articulo.source.name : "Fuente desconocida";
    const fecha = formatearFechaNoticia(articulo.publishedAt);

    const card = document.createElement("article");
    card.className = "news-card";
    card.innerHTML = `
      <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="news-card-link">
        <div class="news-card-media">
          <img src="${escapeHtml(img)}" alt="${escapeHtml(title)}" loading="lazy">
          <span class="news-card-tag">${escapeHtml(label)}</span>
        </div>
        <div class="news-card-body">
          <h3>${escapeHtml(title)}</h3>
          <p>${escapeHtml(desc.length > 145 ? `${desc.slice(0, 145)}...` : desc)}</p>
          <div class="news-card-meta">
            <span><i class="bi bi-calendar3"></i> ${escapeHtml(fecha)}</span>
            <span><i class="bi bi-newspaper"></i> ${escapeHtml(fuente)}</span>
          </div>
        </div>
      </a>
    `;

    card.querySelector("img").addEventListener("error", (e) => {
      e.currentTarget.src = getPlaceholder(label);
    }, { once: true });

    return card;
  }

  function formatearFechaNoticia(value) {
    if (!value) return "Sin fecha";

    const fecha = new Date(value);
    if (Number.isNaN(fecha.getTime())) return "Sin fecha";

    return fecha.toLocaleDateString("es-MX", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  }

  function displayError(message) {
    const { contenedor } = getElementos();
    setEstado("", "info");
    if (!contenedor) return;

    contenedor.innerHTML = `
      <div class="news-empty error">
        <i class="bi bi-exclamation-triangle"></i>
        <p>${escapeHtml(message)}</p>
      </div>
    `;
  }

  function siguiente() {
    paginaActual += 1;
    fetchNoticias({ append: true });
  }

  function bindSelect() {
    const { select } = getElementos();
    if (!select) return;

    select.value = temaActual;
    select.onchange = () => {
      temaActual = select.value || "musica-general";
      fetchNoticias();
    };
  }

  window.mainNoticias = function () {
    temaActual = "musica-general";
    paginaActual = 1;
    bindSelect();
    fetchNoticias();

    if (window.animarTituloGlobal) {
      animarTituloGlobal("#titulo-noticias", "Ultimas Novedades");
    } else {
      const titulo = document.getElementById("titulo-noticias");
      if (titulo) titulo.textContent = "Ultimas Novedades";
    }
  };

  window.siguiente = siguiente;
  window.noticias = { fetchNoticias, displayNoticias, displayError };
  window["init_noticias"] = window.mainNoticias;

  if (document.querySelector(".container-noticias")) {
    window.mainNoticias();
  }
})();
