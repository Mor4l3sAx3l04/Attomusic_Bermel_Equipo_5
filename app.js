// app.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const PORT = process.env.PORT || 3000;

// MIDDLEWARE GLOBAL
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(express.static("public"));
app.set("trust proxy", 1);

// Rate Limiter
const limiter = require("./middleware/rateLimiter");
app.use(limiter);

//IMPORTAR RUTAS
const authRoutes = require("./routes/auth");
const postsRoutes = require("./routes/posts");
const usersRoutes = require("./routes/users");
const adminRoutes = require("./routes/admin");
const spotifyRoutes = require("./routes/spotify");
const newsRoutes = require("./routes/news");
const recomendacionesRoutes = require("./routes/recomendaciones");

// USAR RUTAS
app.use("/", authRoutes);

// Spotify y Noticias
app.use("/spotify", spotifyRoutes);
app.use("/music-news", newsRoutes);

// Publicaciones
app.use("/api", postsRoutes);

// Usuarios
app.use("/api", usersRoutes);

// Recomendaciones 
app.use("/api/recomendaciones", recomendacionesRoutes);

// Panel de Administración
app.use("/api/admin", adminRoutes);

// RUTA DE VERIFICACIÓN DE ROL
const pool = require("./utils/database");
const responses = require("./utils/responses");

app.get("/api/usuario/:correo/rol", async (req, res) => {
  const { correo } = req.params;

  try {
    const result = await pool.query("SELECT rol FROM usuario WHERE correo = $1", [correo]);

    if (result.rows.length === 0) {
      return responses.notFound(res, "Usuario");
    }

    return res.json({ rol: result.rows[0].rol });
  } catch (err) {
    return responses.error(res, "Error en el servidor");
  }
});

//SERVIDOR
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});