// Script para cargar y mostrar noticias musicales usando TheNewsAPI
// Debe incluirse en noticias.html

document.addEventListener('DOMContentLoaded', async () => {
  const container = document.createElement('div');
  container.className = 'news-container content';
  document.body.appendChild(container);

  const url = '/music-news'; // Ahora se consulta al backend

  container.innerHTML = `<div class="search-results-title" style="margin-bottom: 30px;">Últimas noticias de música</div><div class="row" id="news-list"></div>`;
  const newsList = document.getElementById('news-list');

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (!data.data || data.data.length === 0) {
      newsList.innerHTML = '<div class="normaltext">No se encontraron noticias recientes de música.</div>';
      return;
    }
    newsList.innerHTML = data.data.map(article => `
      <div class="col-md-6 col-lg-4 mb-4">
        <div class="search-card" style="min-height: 420px;">
          <img src="${article.image_url || 'images/iconogray.png'}" alt="Noticia musical" style="height: 180px; object-fit: cover;">
          <h3 style="font-size: 1.1rem; color: #5a189a;">${article.title}</h3>
          <p style="font-size: 0.95rem; color: #333;">${article.description ? article.description.substring(0, 120) + '...' : ''}</p>
// ...existing code...
          <a href="${article.url}" target="_blank" class="btn btn-sm" style="background: linear-gradient(160deg, #ba01ff, #00dffc); color: white; margin-top: 10px;">Leer más</a>
          <div style="font-size: 0.8rem; color: #b3b3b3; margin-top: 8px;">${new Date(article.published_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
        </div>
      </div>
    `).join('');
  } catch (e) {
    newsList.innerHTML = '<div class="normaltext">Error al cargar noticias. Intenta más tarde.</div>';
  }
});
