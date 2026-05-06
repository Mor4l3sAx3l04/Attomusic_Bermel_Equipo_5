// app.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");
const app = express();
const PORT = process.env.PORT || 3000;

// MIDDLEWARE GLOBAL
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=()");
  next();
});
app.use(cors({
  origin: process.env.CORS_ORIGIN || true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "X-User-Email"],
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || "attomusic-dev-session-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 15 * 60 * 1000,
  },
}));
app.use(passport.initialize());
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
const cancionesRoutes = require("./routes/canciones");
const notificacionesRouter = require("./routes/notificaciones");

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

// Canciones (calificaciones y comentarios)
app.use("/api/canciones", cancionesRoutes);

//Notificaciones 
app.use("/api/notificaciones", notificacionesRouter);

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
const server = app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`El puerto ${PORT} ya esta en uso. Cierra el otro servidor o ejecuta: $env:PORT=3001; node app.js`);
    process.exit(1);
  }

  throw err;
});
