let cantidadNoticias = 5;
let pageFinal = cantidadNoticias;
let pageInicial = 0;
let temaActual = "Music";

let noticias = {
    fetchNoticias: function() {
        fetch('/music-news')
            .then(response => response.json())
            .then(data => this.displayNoticias(data))
            .catch(() => this.displayError('No se pudieron cargar las noticias.'));
    },
    displayNoticias: function(data) {
        const contenedor = document.querySelector(".container-noticias");
        contenedor.innerHTML = "";

// Asegura que hay artículos válidos
        const articulos = Array.isArray(data.articles) ? data.articles : [];
        if (!articulos.length) {
            contenedor.innerHTML = `<div style="color:#ba01ff;text-align:center;font-size:1.2rem;margin:32px 0;">No hay noticias disponibles.</div>`;
            return;
        }

// Crea filas de 3 noticias
        let row;
        articulos.slice(pageInicial, pageFinal + 1).forEach((articulo, idx) => {
            if (idx % 3 === 0) {
                row = document.createElement("div");
                row.className = "row justify-content-center";
                contenedor.appendChild(row);
            }

// Datos seguros
            const title = articulo.title || "Sin título";
            const img = articulo.urlToImage || "https://via.placeholder.com/300x180?text=Sin+Imagen";
            const desc = articulo.description || "";
            const url = articulo.url || "#";
            const fuente = (articulo.source && articulo.source.name) ? articulo.source.name : "Desconocida";
            let fecha = "Sin fecha";
            if (articulo.publishedAt) {
                try {
                    const d = new Date(articulo.publishedAt);
                    fecha = d.toLocaleDateString("es-ES", { year: 'numeric', month: 'short', day: 'numeric' });
                } catch {}
            }

// Tarjeta tipo canción
            const card = document.createElement("div");
            card.className = "col-md-4 col-sm-6 mb-4 d-flex align-items-stretch";
            card.innerHTML = `
                <div class="search-card vertical-card" style="cursor:pointer;box-shadow:0 2px 12px #0001;" onclick="window.open('${url}','_blank')">
                    <img src="${img}" alt="noticia" style="width:100%;height:180px;object-fit:cover;border-radius:12px 12px 0 0;">
                    <div class="card-info" style="padding:16px;">
                        <h3 style="color:#5a189a;font-size:1.1rem;font-weight:700;">${title}</h3>
                        <p style="color:#333;font-size:0.98rem;">${desc.length > 120 ? desc.slice(0,120) + "..." : desc}</p>
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;">
                            <span style="font-size:0.9rem;color:#ba01ff;"><i class="bi bi-calendar"></i> ${fecha}</span>
                            <span style="font-size:0.9rem;color:#888;"><i class="bi bi-newspaper"></i> ${fuente}</span>
                        </div>
                    </div>
                </div>
            `;
        row.appendChild(card);
    });

// Botón "Ver más" si hay más noticias
    if (pageFinal + 1 < articulos.length) {
        let btnSiguiente = document.createElement("span");
        btnSiguiente.id = "btnSiguiente";
        btnSiguiente.textContent = "Ver más";
        btnSiguiente.className = "btn btn-outline-primary";
        btnSiguiente.style = "display:block;margin:32px auto 0 auto;";
        btnSiguiente.setAttribute("onclick","siguiente()");
        contenedor.appendChild(btnSiguiente);
    }
}
}


function siguiente(){
    pageInicial = pageFinal + 1;
    pageFinal = pageFinal + cantidadNoticias + 1;
//eliminamos el botón siguiente
    const btn = document.querySelector("#btnSiguiente");
    if (btn) btn.remove();
    noticias.fetchNoticias();
}

window.mainNoticias = function() {
    pageFinal = cantidadNoticias;
    pageInicial = 0;
    temaActual = "Music";
    noticias.fetchNoticias();
};

if (document.querySelector('.container-noticias')) {
    window.mainNoticias();
}