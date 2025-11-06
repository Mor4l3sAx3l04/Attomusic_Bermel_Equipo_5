// routes/news.js
const express = require("express");
const fetch = require("node-fetch");
const router = express.Router();

const API_KEY = process.env.NEWS_API_KEY; // Tu clave privada (colócala en Render o en .env)
const BASE_URL = "https://newsapi.org/v2/everything";

router.get("/", async (req, res) => {
  try {
    const tema = req.query.q || "music";
    const url = `${BASE_URL}?q=${tema}&language=es&sortBy=publishedAt&pageSize=20&apiKey=${API_KEY}`;
    const respuesta = await fetch(url);
    const datos = await respuesta.json();
    res.json(datos);
  } catch (err) {
    console.error("Error al obtener noticias:", err);
    res.status(500).json({ error: "Error al obtener noticias" });
  }
});

module.exports = router;
