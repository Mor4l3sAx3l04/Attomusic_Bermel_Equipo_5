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