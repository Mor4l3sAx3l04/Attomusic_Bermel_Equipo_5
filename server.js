const express = require("express");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

let accessToken = "";

// Función para obtener token
async function getAccessToken() {
  const tokenUrl = "https://accounts.spotify.com/api/token";
  const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");

  const res = await axios.post(tokenUrl, "grant_type=client_credentials", {
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  accessToken = res.data.access_token;
}

// Endpoint de búsqueda general
app.get("/search", async (req, res) => {
  try {
    if (!accessToken) await getAccessToken();
    const query = req.query.q;
    const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track,artist,album&limit=10`;
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    res.json(response.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Error buscando en Spotify" });
  }
});

app.listen(3000, () => console.log("Servidor corriendo en puerto 3000"));
