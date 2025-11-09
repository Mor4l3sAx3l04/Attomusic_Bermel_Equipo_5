// app.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const { Pool } = require("pg");
const axios = require("axios");

// IMPORTA las rutas de Spotify
const spotifyRoutes = require("./routes/spotify");
const newsRoutes = require("./routes/news");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Usa las rutas de Spotify y The News API
app.use("/spotify", spotifyRoutes);
app.use("/music-news", newsRoutes);

// CONEXIÓN A POSTGRESQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

pool.connect()
  .then(() => console.log("Conectado a PostgreSQL"))
  .catch(err => console.error("Error de conexión:", err));

// RUTA: Registro de usuario
app.post("/register", async (req, res) => {
  const { usuario, correo, contrasena } = req.body;

  if (!usuario || !correo || !contrasena) {
    return res.status(400).json({ error: "Faltan campos obligatorios" });
  }

  try {
    // Verificar si ya existe usuario o correo
    const existe = await pool.query(
      "SELECT * FROM usuario WHERE usuario = $1 OR correo = $2",
      [usuario, correo]
    );

    if (existe.rows.length > 0) {
      return res.status(400).json({ error: "Usuario o correo ya registrado" });
    }

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(contrasena, 10);

    // Insertar nuevo usuario
    await pool.query(
      `INSERT INTO usuario (usuario, correo, contrasena, fecha_reg, rol, estado)
      VALUES ($1, $2, $3, CURRENT_DATE, 'usuario', 'activo')`,
      [usuario, correo, hashedPassword]
    );

    res.json({ message: "Usuario registrado correctamente" });
  } catch (err) {
    console.error("Error en registro:", err);
    res.status(500).json({ error: "Error en el registro de usuario" });
  }
});

// RUTA: Inicio de sesión
app.post("/login", async (req, res) => {
  const { usuario, contrasena } = req.body;

  if (!usuario || !contrasena) {
    return res.status(400).json({ error: "Faltan usuario o contraseña" });
  }

  try {
    // Buscar usuario
    const result = await pool.query("SELECT * FROM usuario WHERE usuario = $1", [usuario]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Usuario no encontrado" });
    }

    const user = result.rows[0];

    // Comparar contraseñas
    const match = await bcrypt.compare(contrasena, user.contrasena);
    if (!match) {
      return res.status(401).json({ error: "Contraseña incorrecta" });
    }

    res.json({
      message: "Inicio de sesión exitoso",
      user: {
        id_usuario: user.id_usuario,
        usuario: user.usuario,
        correo: user.correo,
        rol: user.rol,
      },
    });
  } catch (err) {
    console.error("Error en login:", err);
    res.status(500).json({ error: "Error en inicio de sesión" });
  }
});

app.post("/api/publicacion", async (req, res) => {
  try {
    const { correo, idCancion, publicacion, fechaHora } = req.body;

    if (!correo || !publicacion)
      return res.status(400).json({ error: "Datos incompletos" });

    // Verificar usuario por correo
    const userResult = await pool.query("SELECT id_usuario FROM usuario WHERE correo = $1", [correo]);
    if (userResult.rowCount === 0)
      return res.status(404).json({ error: "Usuario no encontrado" });

    const id_usuario = userResult.rows[0].id_usuario;
    let id_cancion_final = null;

    // Si hay canción, verificar si existe, y si no, traerla desde Spotify
    if (idCancion) {
      const cancionExiste = await pool.query("SELECT id_cancion FROM cancion WHERE id_cancion = $1", [idCancion]);

      if (cancionExiste.rowCount === 0) {
        // Obtener token temporal de Spotify (usa la ruta auxiliar)
        const tokenResp = await axios.get("http://localhost:3000/spotify/token");
        const token = tokenResp.data.access_token;

        // Obtener info de la canción
        const trackResp = await axios.get(`https://api.spotify.com/v1/tracks/${idCancion}`, {
          headers: { Authorization: "Bearer " + token },
        });
        const track = trackResp.data;

        await pool.query(
          `INSERT INTO cancion (id_cancion, nombre, artista, album, url_preview)
          VALUES ($1, $2, $3, $4, $5)`,
          [track.id, track.name, track.artists[0].name, track.album.name, track.preview_url]
        );
      }

      id_cancion_final = idCancion;
    }

    // Insertar publicación
    await pool.query(
      `INSERT INTO publicacion (id_usuario, id_cancion, publicacion, fecha_pub)
      VALUES ($1, $2, $3, $4)`,
      [id_usuario, id_cancion_final, publicacion, fechaHora]
    );

    res.json({ message: "Publicación creada con éxito" });
  } catch (err) {
    console.error("Error en /api/publicacion:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

//RUTA PARA MOSTRAR PUBLICACIONES
app.get("/api/publicaciones", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.id_publicacion, u.usuario, u.correo, p.publicacion, p.fecha_pub,
            c.nombre AS cancion, c.artista, c.album, c.url_preview
      FROM publicacion p
      JOIN usuario u ON p.id_usuario = u.id_usuario
      LEFT JOIN cancion c ON p.id_cancion = c.id_cancion
      ORDER BY p.fecha_pub DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("Error en /api/publicaciones:", err);
    res.status(500).json({ error: "Error obteniendo publicaciones" });
  }
});


//Servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
