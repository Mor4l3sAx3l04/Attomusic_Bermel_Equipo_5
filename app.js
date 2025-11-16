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
    const existe = await pool.query(
      "SELECT * FROM usuario WHERE usuario = $1 OR correo = $2",
      [usuario, correo]
    );

    if (existe.rows.length > 0) {
      return res.status(400).json({ error: "Usuario o correo ya registrado" });
    }

    const hashedPassword = await bcrypt.hash(contrasena, 10);

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
    const result = await pool.query("SELECT * FROM usuario WHERE usuario = $1", [usuario]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Usuario no encontrado" });
    }

    const user = result.rows[0];

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

// RUTA: Crear publicación
app.post("/api/publicacion", async (req, res) => {
  try {
    const { correo, idCancion, publicacion } = req.body;

    if (!correo || !publicacion)
      return res.status(400).json({ error: "Datos incompletos" });

    const userResult = await pool.query("SELECT id_usuario FROM usuario WHERE correo = $1", [correo]);
    if (userResult.rowCount === 0)
      return res.status(404).json({ error: "Usuario no encontrado" });

    const id_usuario = userResult.rows[0].id_usuario;
    let id_cancion_final = null;

    if (idCancion) {
      const cancionExiste = await pool.query("SELECT id_cancion FROM cancion WHERE id_cancion = $1", [idCancion]);

      if (cancionExiste.rowCount === 0) {
        const tokenResp = await axios.get("http://localhost:3000/spotify/token");
        const token = tokenResp.data.access_token;

        const trackResp = await axios.get(`https://api.spotify.com/v1/tracks/${idCancion}`, {
          headers: { Authorization: "Bearer " + token },
        });
        const track = trackResp.data;

        const imagenUrl = track.album?.images?.[1]?.url || track.album?.images?.[0]?.url || null;
        console.log("📸 URL de imagen:", imagenUrl);

        await pool.query(
          `INSERT INTO cancion (id_cancion, nombre, artista, album, url_preview, imagen_url)
          VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            track.id, 
            track.name, 
            track.artists[0].name, 
            track.album.name, 
            track.preview_url,
            imagenUrl
          ]
        );
      }

      id_cancion_final = idCancion;
    }

    // Usar NOW() para obtener timestamp exacto
    await pool.query(
      `INSERT INTO publicacion (id_usuario, id_cancion, publicacion, fecha_pub)
      VALUES ($1, $2, $3, NOW())`,
      [id_usuario, id_cancion_final, publicacion]
    );

    res.json({ message: "Publicación creada con éxito" });
  } catch (err) {
    console.error("Error en /api/publicacion:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// RUTA: Obtener publicaciones con info de canción
app.get("/api/publicaciones", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.id_publicacion, u.usuario, u.correo, p.publicacion, p.fecha_pub,
            c.id_cancion, c.nombre AS cancion, c.artista, c.album, c.url_preview, c.imagen_url AS imagen_cancion,
            (SELECT COUNT(*) FROM reaccion WHERE id_publicacion = p.id_publicacion AND tipo = 'like') as likes,
            (SELECT COUNT(*) FROM comentario WHERE id_publicacion = p.id_publicacion) as comentarios
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

// RUTA: Dar like a una publicación
app.post("/api/publicacion/:id/like", async (req, res) => {
  try {
    const { id } = req.params;
    const { correo } = req.body;

    if (!correo) {
      return res.status(400).json({ error: "Usuario no autenticado" });
    }

    const userResult = await pool.query("SELECT id_usuario FROM usuario WHERE correo = $1", [correo]);
    if (userResult.rowCount === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const id_usuario = userResult.rows[0].id_usuario;

    // Verificar si ya dio like
    const existingLike = await pool.query(
      "SELECT * FROM reaccion WHERE id_publicacion = $1 AND id_usuario = $2 AND tipo = 'like'",
      [id, id_usuario]
    );

    if (existingLike.rowCount > 0) {
      // Quitar like
      await pool.query(
        "DELETE FROM reaccion WHERE id_publicacion = $1 AND id_usuario = $2 AND tipo = 'like'",
        [id, id_usuario]
      );
      res.json({ message: "Like removido", liked: false });
    } else {
      // Dar like
      await pool.query(
        "INSERT INTO reaccion (id_publicacion, id_usuario, tipo) VALUES ($1, $2, 'like')",
        [id, id_usuario]
      );
      res.json({ message: "Like agregado", liked: true });
    }
  } catch (err) {
    console.error("Error en like:", err);
    res.status(500).json({ error: "Error al procesar like" });
  }
});

// RUTA: Agregar comentario
app.post("/api/publicacion/:id/comentario", async (req, res) => {
  try {
    const { id } = req.params;
    const { correo, comentario } = req.body;

    if (!correo || !comentario) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    const userResult = await pool.query("SELECT id_usuario FROM usuario WHERE correo = $1", [correo]);
    if (userResult.rowCount === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const id_usuario = userResult.rows[0].id_usuario;

    await pool.query(
      "INSERT INTO comentario (id_publicacion, id_usuario, comentario, fecha_com) VALUES ($1, $2, $3, NOW())",
      [id, id_usuario, comentario]
    );

    res.json({ message: "Comentario agregado" });
  } catch (err) {
    console.error("Error en comentario:", err);
    res.status(500).json({ error: "Error al agregar comentario" });
  }
});

// RUTA: Obtener comentarios de una publicación
app.get("/api/publicacion/:id/comentarios", async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT c.id_comentario, c.comentario, c.fecha_com, u.usuario
      FROM comentario c
      JOIN usuario u ON c.id_usuario = u.id_usuario
      WHERE c.id_publicacion = $1
      ORDER BY c.fecha_com DESC
    `, [id]);

    res.json(result.rows);
  } catch (err) {
    console.error("Error obteniendo comentarios:", err);
    res.status(500).json({ error: "Error obteniendo comentarios" });
  }
});

// Servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});