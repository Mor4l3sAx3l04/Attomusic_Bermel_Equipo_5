// routes/news.js
const express = require("express");
const fetch = require("node-fetch");
const router = express.Router();

const API_KEY = process.env.THENEWSAPI_KEY;
const NEWS_API_BASE = "https://newsapi.org/v2";
const PAGE_SIZE = 21;

function getRecentFromDate(days = 28) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

const NEWS_TOPICS = {
  "musica-general": {
    label: "Musica",
    params: { q: "(musica OR musical OR album OR cancion OR cantante OR banda)", language: "es" }
  },
  "musica-pop": {
    label: "Pop",
    params: { q: '(pop OR "musica pop") AND (cantante OR album OR concierto)', language: "es" }
  },
  "musica-rock": {
    label: "Rock",
    params: { q: '(rock OR "musica rock") AND (banda OR album OR concierto)', language: "es" }
  },
  "musica-reggaeton": {
    label: "Reggaeton",
    params: { q: '(reggaeton OR urbano OR "musica urbana") AND (cantante OR album OR concierto)', language: "es" }
  },
  "musica-regional": {
    label: "Regional mexicano",
    params: { q: '("regional mexicano" OR corridos OR banda OR norteno) AND (musica OR cantante OR concierto)', language: "es" }
  },
  "musica-electronica": {
    label: "Electronica",
    params: { q: "(electronica OR dj OR festival) AND (musica OR concierto)", language: "es" }
  },
  "musica-cantantes": {
    label: "Cantantes",
    params: { q: '(cantante OR artista OR "nuevo album" OR entrevista) AND musica', language: "es" }
  },
  "musica-conciertos": {
    label: "Conciertos",
    params: { q: "(concierto OR gira OR festival OR boletos) AND musica", language: "es" }
  },
  cine: {
    label: "Cine",
    params: { q: "(cine OR pelicula OR estreno OR taquilla OR actores)", language: "es" },
    fallbackQ: "(movies OR cinema OR film OR box office OR actors)"
  },
  general: {
    label: "Noticias generales",
    params: { q: "(Mexico OR mundo OR politica OR economia OR sociedad OR gobierno)", language: "es" },
    fallbackQ: "(world OR politics OR economy OR society OR government)"
  },
  entretenimiento: {
    label: "Entretenimiento",
    params: { q: "(entretenimiento OR television OR celebridades OR farandula OR cultura OR streaming)", language: "es" },
    fallbackQ: "(entertainment OR celebrity OR television OR streaming OR culture)"
  },
  tecnologia: {
    label: "Tecnologia",
    params: { q: '(tecnologia OR "inteligencia artificial" OR software OR gadgets OR internet)', language: "es" },
    fallbackQ: '(technology OR "artificial intelligence" OR software OR gadgets)'
  },
  ciencia: {
    label: "Ciencia",
    params: { q: "(ciencia OR investigacion OR espacio OR astronomia OR descubrimiento)", language: "es" },
    fallbackQ: "(science OR research OR space OR astronomy OR discovery)"
  },
  salud: {
    label: "Salud",
    params: { q: "(salud OR medicina OR bienestar OR hospitales OR enfermedad)", language: "es" },
    fallbackQ: "(health OR medicine OR wellness OR disease)"
  },
  deportes: {
    label: "Deportes",
    params: { q: '(deportes OR futbol OR beisbol OR tenis OR "Formula 1")', language: "es" },
    fallbackQ: "(sports OR football OR soccer OR baseball OR tennis)"
  },
  negocios: {
    label: "Negocios",
    params: { q: "(negocios OR empresas OR mercados OR economia OR finanzas)", language: "es" },
    fallbackQ: "(business OR companies OR markets OR finance OR economy)"
  }
};

function cleanParams(params) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

function buildNewsApiUrl(topicKey, page = 1, overrides = {}) {
  const topic = NEWS_TOPICS[topicKey] || NEWS_TOPICS["musica-general"];
  const params = new URLSearchParams(cleanParams({
    ...topic.params,
    sortBy: "publishedAt",
    from: getRecentFromDate(),
    ...overrides,
    pageSize: String(PAGE_SIZE),
    page: String(page),
    apiKey: API_KEY
  }));

  return {
    label: topic.label,
    url: `${NEWS_API_BASE}/everything?${params.toString()}`
  };
}

async function requestNewsApi(url) {
  const respuesta = await fetch(url);
  const datos = await respuesta.json();
  return { ok: respuesta.ok, datos };
}

async function fetchTopicNews(topicKey, page) {
  const topic = NEWS_TOPICS[topicKey] || NEWS_TOPICS["musica-general"];
  const primary = buildNewsApiUrl(topicKey, page);
  let response = await requestNewsApi(primary.url);

  if (response.ok && Array.isArray(response.datos.articles) && response.datos.articles.length > 0) {
    return { ...response.datos, label: primary.label, fallbackUsed: false };
  }

  const fallback = buildNewsApiUrl(topicKey, page, {
    q: topic.fallbackQ || topic.params.q,
    language: undefined,
    sortBy: "relevancy",
    from: getRecentFromDate(28)
  });

  response = await requestNewsApi(fallback.url);
  return { ...response.datos, label: fallback.label, fallbackUsed: true };
}

router.get("/topics", (_req, res) => {
  res.json({
    defaultTopic: "musica-general",
    topics: Object.entries(NEWS_TOPICS).map(([key, value]) => ({
      key,
      label: value.label
    }))
  });
});

router.get("/", async (req, res) => {
  try {
    if (!API_KEY) {
      return res.status(500).json({ error: "Falta configurar la API key de NewsAPI" });
    }

    const topic = req.query.topic || req.query.q || "musica-general";
    const page = Number.parseInt(req.query.page, 10) || 1;
    const datos = await fetchTopicNews(topic, page);
    res.json({ ...datos, topic, label: datos.label });
  } catch (err) {
    console.error("Error al obtener noticias:", err);
    res.status(500).json({ error: "Error al obtener noticias" });
  }
});

module.exports = router;
