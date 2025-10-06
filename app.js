require("dotenv").config();
console.log("Client ID:", process.env.SPOTIFY_CLIENT_ID);
console.log("Client Secret:", process.env.SPOTIFY_CLIENT_SECRET);
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static("public"));
// Servir archivos JS fuera de /public para frontend (noticias.js, temas.js)
app.use('/noticias.js', express.static(__dirname + '/noticias.js'));
app.use('/temas.js', express.static(__dirname + '/temas.js'));

// === Noticias musicales desde TheNewsAPI ===
// Debes poner tu API key de TheNewsAPI en el archivo .env como THENEWSAPI_KEY=...
app.get('/music-news', async (req, res) => {
  const apiKey = process.env.THENEWSAPI_KEY;
  if (!apiKey) {
    console.error('Falta THENEWSAPI_KEY en .env');
    return res.status(500).json({ error: 'Falta THENEWSAPI_KEY en .env' });
  }
  const url = `https://api.thenewsapi.com/v1/news/all?api_token=${apiKey}&language=es&categories=music&limit=8`;
  console.log('[MUSIC-NEWS] Consultando:', url);
  try {
    const response = await axios.get(url);
    console.log('[MUSIC-NEWS] Respuesta:', JSON.stringify(response.data));
    if (!response.data || !response.data.data || response.data.data.length === 0) {
      console.warn('[MUSIC-NEWS] No se encontraron noticias musicales.');
    }
    res.json(response.data);
  } catch (err) {
    console.error('[MUSIC-NEWS] Error:', err.response?.data || err.message || err);
    res.status(500).json({ error: 'Error obteniendo noticias musicales', details: err.response?.data || err.message || err });
  }
});

// --- Función para obtener access token con Client Credentials ---
let accessToken = null;
let tokenExpiresAt = 0;

async function getAccessToken() {
  const now = Date.now();
  if (accessToken && now < tokenExpiresAt) return accessToken;

  const resp = await axios.post(
    "https://accounts.spotify.com/api/token",
    new URLSearchParams({ grant_type: "client_credentials" }),
    {
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(
            process.env.SPOTIFY_CLIENT_ID + ":" + process.env.SPOTIFY_CLIENT_SECRET
          ).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  accessToken = resp.data.access_token;
  tokenExpiresAt = now + resp.data.expires_in * 1000 - 60000; // refresca 1min antes
  return accessToken;
}

// Middleware para agregar token a headers
async function withToken(req, res, next) {
  try {
    const token = await getAccessToken();
    req.token = token;
    next();
  } catch (err) {
    console.error(err);
    res.status(500).send("Error obteniendo token de Spotify");
  }
}

// ====== RUTAS ======

// 🔎 Búsqueda
app.get("/search", withToken, async (req, res) => {
  const { q, type = "track,artist,album", limit = 10 } = req.query;
  if (!q) return res.status(400).send("Falta parámetro ?q=");

  try {
    const response = await axios.get("https://api.spotify.com/v1/search", {
      headers: { Authorization: "Bearer " + req.token },
      params: { q, type, limit },
    });
    res.json(response.data);
  } catch (err) {
    console.error(err.response?.data || err);
    res.status(500).json({ error: "Error en búsqueda" });
  }
});

// 🎵 Track por ID
app.get("/track/:id", withToken, async (req, res) => {
  try {
    const response = await axios.get(
      `https://api.spotify.com/v1/tracks/${req.params.id}`,
      { headers: { Authorization: "Bearer " + req.token } }
    );
    res.json(response.data);
  } catch (err) {
    console.error(err.response?.data || err);
    res.status(500).json({ error: "Error obteniendo track" });
  }
});

// 👩‍🎤 Artista por ID
app.get("/artist/:id", withToken, async (req, res) => {
  try {
    const response = await axios.get(
      `https://api.spotify.com/v1/artists/${req.params.id}`,
      { headers: { Authorization: "Bearer " + req.token } }
    );
    res.json(response.data);
  } catch (err) {
    console.error(err.response?.data || err);
    res.status(500).json({ error: "Error obteniendo artista" });
  }
});

// 💿 Álbum por ID
app.get("/album/:id", withToken, async (req, res) => {
  try {
    const response = await axios.get(
      `https://api.spotify.com/v1/albums/${req.params.id}`,
      { headers: { Authorization: "Bearer " + req.token } }
    );
    res.json(response.data);
  } catch (err) {
    console.error(err.response?.data || err);
    res.status(500).json({ error: "Error obteniendo álbum" });
  }
});

// 🚀 Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor en http://localhost:${PORT}`);
});

//temas

/*API News
let cantidadNoticias = 5;
let pageFinal = cantidadNoticias;
let pageInicial = 0;
let temaActual = "Music";

let noticias = {
  "apiKey":"f3798e116eb342b2bae58e7f0cbd9c11",
  fetchNoticias:function(temaActual){
    fetch(
      "https://newsapi.org/v2/everything?q="
      +temaActual+
      "&language=es&apiKey="+this.apiKey
    )
    .then((response)=>response.json())
    .then((data)=>this.displayNoticias(data));
  },
  displayNoticias: function(data){
    //elimino todo si ha seleccionado un nuevo tema
    if(pageInicial==0){
      document.querySelector(".container-noticias").textContent ="";
    }
    // Render en filas de 3, estilo tarjetas
    let articles = data.articles || [];
    let visible = articles.slice(pageInicial, pageFinal+1);
    for(let i=0; i<visible.length; i+=3){
      const row = document.createElement("div");
      row.className = "row justify-content-center mb-4";
      for(let j=0; j<3 && i+j<visible.length; j++){
        const art = visible[i+j];
        if(!art) continue;
        const {title, urlToImage, publishedAt, source, url, description} = art;
        const col = document.createElement("div");
        col.className = "col-12 col-md-4 d-flex align-items-stretch";
        const card = document.createElement("div");
        card.className = "search-card vertical-card w-100";
        card.style.cursor = "pointer";
        card.onclick = function(){ window.open(url, '_blank'); };
        card.innerHTML = `
          <img src="${urlToImage || 'images/iconowhite.png'}" alt="noticia">
          <div class="card-info">
            <h3>${title || 'Sin título'}</h3>
            ${description ? `<p>${description}</p>` : ''}
            <div style="display:flex;gap:18px;align-items:center;flex-wrap:wrap;justify-content:center;">
              ${publishedAt ? `<span style='display:inline-flex;align-items:center;gap:4px;'><span style='font-size:1.2em;'>🗓️</span> ${publishedAt.split("T")[0].split("-").reverse().join("-")}</span>` : ''}
              ${source?.name ? `<span style='display:inline-flex;align-items:center;gap:4px;'><span style='font-size:1.2em;'>📰</span> ${source.name}</span>` : ''}
            </div>
          </div>
        `;
        col.appendChild(card);
        row.appendChild(col);
      }
      document.querySelector(".container-noticias").appendChild(row);
    }
    let btnSiguiente = document.createElement("span");
    btnSiguiente.id = "btnSiguiente";
    btnSiguiente.textContent = "Ver más";
    btnSiguiente.setAttribute("onclick","siguiente()");
    document.querySelector(".container-noticias").appendChild(btnSiguiente);
  }
}


function buscar(cat){
  pageInicial = 0;
  pageFinal = cantidadNoticias;
  temaActual = cat;
  noticias.fetchNoticias(cat);
}

function buscarTema(){
  pageInicial = 0;
  pageFinal = cantidadNoticias;

  let tema = document.querySelector("#busqueda").value;
  temaActual = tema;
  noticias.fetchNoticias(temaActual);
}

function siguiente(){
  pageInicial = pageFinal + 1;
  pageFinal = pageFinal + cantidadNoticias + 1;
  //eliminamos el botón siguiente
  document.querySelector("#btnSiguiente").remove();
  noticias.fetchNoticias(temaActual);

}

noticias.fetchNoticias(temaActual);*/