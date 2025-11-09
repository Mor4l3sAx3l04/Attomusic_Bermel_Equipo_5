// ===============================
// spotify.js - rutas relacionadas con la API de Spotify
// ===============================
const express = require("express");
const axios = require("axios");

const router = express.Router();

// --- Variables para el token ---
let accessToken = null;
let tokenExpiresAt = 0;

// --- Función para obtener nuevo token ---
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
  tokenExpiresAt = now + resp.data.expires_in * 1000 - 60000;
  return accessToken;
}

// --- Middleware para añadir token a cada request ---
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

// ===============================
// RUTAS SPOTIFY
// ===============================

// 🔎 Buscar
router.get("/search", withToken, async (req, res) => {
  const { q, type = "track,artist,album", limit = 10 } = req.query;
  if (!q) return res.status(400).send("Falta parámetro ?q=");

  try {
    const response = await axios.get("https://api.spotify.com/v1/search", {
      headers: { Authorization: "Bearer " + req.token },
      params: { q, type, limit },
    });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: "Error en búsqueda" });
  }
});

// 🎵 Track por ID
router.get("/track/:id", withToken, async (req, res) => {
  try {
    const response = await axios.get(
      `https://api.spotify.com/v1/tracks/${req.params.id}`,
      { headers: { Authorization: "Bearer " + req.token } }
    );
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: "Error obteniendo track" });
  }
});

// 👩‍🎤 Artista por ID
router.get("/artist/:id", withToken, async (req, res) => {
  try {
    const response = await axios.get(
      `https://api.spotify.com/v1/artists/${req.params.id}`,
      { headers: { Authorization: "Bearer " + req.token } }
    );
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: "Error obteniendo artista" });
  }
});

// 💿 Álbum por ID
router.get("/album/:id", withToken, async (req, res) => {
  try {
    const response = await axios.get(
      `https://api.spotify.com/v1/albums/${req.params.id}`,
      { headers: { Authorization: "Bearer " + req.token } }
    );
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: "Error obteniendo álbum" });
  }
});

router.get("/token", async (req, res) => {
  try {
    const token = await getAccessToken();
    res.json({ access_token: token });
  } catch (err) {
    console.error("Error obteniendo token:", err);
    res.status(500).json({ error: "No se pudo obtener el token" });
  }
});

module.exports = router;
