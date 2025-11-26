// app.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const { Pool } = require("pg");
const axios = require("axios");
const rateLimit = require("express-rate-limit");

// IMPORTA las rutas de Spotify
const spotifyRoutes = require("./routes/spotify");
const newsRoutes = require("./routes/news");
const app = express();
const PORT = process.env.PORT || 3000;


app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.static("public"));

app.set('trust proxy', 1);

// Usa las rutas de Spotify y The News API
app.use("/spotify", spotifyRoutes);
app.use("/music-news", newsRoutes);

// CONEXIÓN A POSTGRESQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minutos
  max: 60, // Máximo 60 peticiones por 1 minuto por IP
  message: { error: "Demasiadas peticiones, intenta más tarde." },
});

app.use(limiter);

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

// RUTA: Restablecer contraseña (versión simple)
app.post("/reset-password", async (req, res) => {
  const { nombre, correo, nuevaContrasena } = req.body;

  if (!nombre || !correo || !nuevaContrasena) {
    return res.status(400).json({ error: "Faltan datos obligatorios" });
  }

  if (nuevaContrasena.length < 6) {
    return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
  }

  try {
    // Verificar que el usuario y correo coincidan
    const userResult = await pool.query(
      "SELECT id_usuario FROM usuario WHERE usuario = $1 AND correo = $2",
      [nombre, correo]
    );

    if (userResult.rowCount === 0) {
      return res.status(404).json({ error: "Usuario o correo incorrectos" });
    }

    // Hashear nueva contraseña
    const hashedPassword = await bcrypt.hash(nuevaContrasena, 10);

    // Actualizar contraseña
    await pool.query(
      "UPDATE usuario SET contrasena = $1 WHERE correo = $2",
      [hashedPassword, correo]
    );

    res.json({ message: "Contraseña actualizada correctamente" });

  } catch (err) {
    console.error("Error en reset-password:", err);
    res.status(500).json({ error: "Error al actualizar la contraseña" });
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

    //VALDIAR PUBLICACIÓN CON GEMINI 
    const { validarPublicacion } = require("./routes/gemini");
    const moderacion = await validarPublicacion(publicacion);
    if (!moderacion.apto) {
      return res.status(400).json({ error: "Publicación no apta: " + moderacion.razon });
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
      SELECT p.id_publicacion, u.id_usuario, u.usuario, u.correo, u.foto, p.publicacion, p.fecha_pub,
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

    //VALDIAR PUBLICACIÓN CON GEMINI 
    const { validarPublicacion } = require("./routes/gemini");
    const moderacion = await validarPublicacion(comentario);
    if (!moderacion.apto) {
      return res.status(400).json({ error: "Publicación no apta: " + moderacion.razon });
    }
    console.log (comentario);
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

// RUTA: Obtener perfil del usuario
app.get("/api/perfil/:correo", async (req, res) => {
  try {
    const { correo } = req.params;

    const userResult = await pool.query(
      `SELECT id_usuario, usuario, correo, fecha_reg, foto, rol, estado 
      FROM usuario WHERE correo = $1`,
      [correo]
    );

    if (userResult.rowCount === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json(userResult.rows[0]);
  } catch (err) {
    console.error("Error obteniendo perfil:", err);
    res.status(500).json({ error: "Error obteniendo perfil" });
  }
});

// RUTA: Actualizar perfil del usuario
app.put("/api/perfil", async (req, res) => {
  try {
    const { correo, nuevoUsuario, nuevoCorreo, foto } = req.body;

    if (!correo) {
      return res.status(400).json({ error: "Correo es obligatorio" });
    }

    // Verificar si el nuevo correo ya existe (si es diferente al actual)
    if (nuevoCorreo && nuevoCorreo !== correo) {
      const existe = await pool.query(
        "SELECT id_usuario FROM usuario WHERE correo = $1",
        [nuevoCorreo]
      );
      if (existe.rowCount > 0) {
        return res.status(400).json({ error: "El correo ya está en uso" });
      }
    }

    // Verificar si el nuevo usuario ya existe (si es diferente al actual)
    if (nuevoUsuario) {
      const userActual = await pool.query(
        "SELECT usuario FROM usuario WHERE correo = $1",
        [correo]
      );
      
      if (userActual.rows[0].usuario !== nuevoUsuario) {
        const existe = await pool.query(
          "SELECT id_usuario FROM usuario WHERE usuario = $1",
          [nuevoUsuario]
        );
        if (existe.rowCount > 0) {
          return res.status(400).json({ error: "El nombre de usuario ya está en uso" });
        }
      }
    }

    // Actualizar perfil
    const updates = [];
    const values = [];
    let paramCounter = 1;

    if (nuevoUsuario) {
      updates.push(`usuario = $${paramCounter++}`);
      values.push(nuevoUsuario);
    }
    if (nuevoCorreo) {
      updates.push(`correo = $${paramCounter++}`);
      values.push(nuevoCorreo);
    }
    if (foto !== undefined) {
      updates.push(`foto = $${paramCounter++}`);
      values.push(foto);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No hay datos para actualizar" });
    }

    values.push(correo);
    const query = `UPDATE usuario SET ${updates.join(", ")} WHERE correo = $${paramCounter}`;

    await pool.query(query, values);

    res.json({ message: "Perfil actualizado correctamente" });
  } catch (err) {
    console.error("Error actualizando perfil:", err);
    res.status(500).json({ error: "Error actualizando perfil" });
  }
});

// RUTA: Obtener publicaciones del usuario
app.get("/api/perfil/:correo/publicaciones", async (req, res) => {
  try {
    const { correo } = req.params;

    const result = await pool.query(`
      SELECT p.id_publicacion, p.publicacion, p.fecha_pub,
            c.id_cancion, c.nombre AS cancion, c.artista, c.album, c.imagen_url AS imagen_cancion,
            (SELECT COUNT(*) FROM reaccion WHERE id_publicacion = p.id_publicacion AND tipo = 'like') as likes,
            (SELECT COUNT(*) FROM comentario WHERE id_publicacion = p.id_publicacion) as comentarios
      FROM publicacion p
      JOIN usuario u ON p.id_usuario = u.id_usuario
      LEFT JOIN cancion c ON p.id_cancion = c.id_cancion
      WHERE u.correo = $1
      ORDER BY p.fecha_pub DESC
    `, [correo]);

    res.json(result.rows);
  } catch (err) {
    console.error("Error obteniendo publicaciones del usuario:", err);
    res.status(500).json({ error: "Error obteniendo publicaciones" });
  }
});

// RUTA: Eliminar publicación
app.delete("/api/publicacion/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { correo } = req.body;

    if (!correo) {
      return res.status(400).json({ error: "Usuario no autenticado" });
    }

    // Verificar que la publicación pertenezca al usuario
    const checkResult = await pool.query(`
      SELECT p.id_publicacion 
      FROM publicacion p
      JOIN usuario u ON p.id_usuario = u.id_usuario
      WHERE p.id_publicacion = $1 AND u.correo = $2
    `, [id, correo]);

    if (checkResult.rowCount === 0) {
      return res.status(403).json({ error: "No tienes permiso para eliminar esta publicación" });
    }

    await pool.query("DELETE FROM publicacion WHERE id_publicacion = $1", [id]);

    res.json({ message: "Publicación eliminada correctamente" });
  } catch (err) {
    console.error("Error eliminando publicación:", err);
    res.status(500).json({ error: "Error eliminando publicación" });
  }
});

// RUTA: Editar publicación
app.put("/api/publicacion/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { correo, publicacion } = req.body;

    if (!correo || !publicacion) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    // Verificar que la publicación pertenezca al usuario
    const checkResult = await pool.query(`
      SELECT p.id_publicacion 
      FROM publicacion p
      JOIN usuario u ON p.id_usuario = u.id_usuario
      WHERE p.id_publicacion = $1 AND u.correo = $2
    `, [id, correo]);

    if (checkResult.rowCount === 0) {
      return res.status(403).json({ error: "No tienes permiso para editar esta publicación" });
    }

    await pool.query(
      "UPDATE publicacion SET publicacion = $1 WHERE id_publicacion = $2",
      [publicacion, id]
    );

    res.json({ message: "Publicación actualizada correctamente" });
  } catch (err) {
    console.error("Error actualizando publicación:", err);
    res.status(500).json({ error: "Error actualizando publicación" });
  }
});

// RUTA: Seguir/Dejar de seguir usuario
app.post("/api/seguir/:id_usuario", async (req, res) => {
  try {
    const { id_usuario } = req.params;
    const { correo } = req.body;

    if (!correo) {
      return res.status(400).json({ error: "Usuario no autenticado" });
    }

    // Obtener ID del usuario actual
    const userResult = await pool.query("SELECT id_usuario FROM usuario WHERE correo = $1", [correo]);
    if (userResult.rowCount === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const id_seguidor = userResult.rows[0].id_usuario;

    // No puede seguirse a sí mismo
    if (parseInt(id_seguidor) === parseInt(id_usuario)) {
      return res.status(400).json({ error: "No puedes seguirte a ti mismo" });
    }

    // Verificar si ya lo sigue
    const existeSeguimiento = await pool.query(
      "SELECT * FROM seguimiento WHERE id_usuario_seguidor = $1 AND id_usuario_seguido = $2",
      [id_seguidor, id_usuario]
    );

    if (existeSeguimiento.rowCount > 0) {
      // Dejar de seguir
      await pool.query(
        "DELETE FROM seguimiento WHERE id_usuario_seguidor = $1 AND id_usuario_seguido = $2",
        [id_seguidor, id_usuario]
      );
      res.json({ message: "Dejaste de seguir", siguiendo: false });
    } else {
      // Seguir
      await pool.query(
        "INSERT INTO seguimiento (id_usuario_seguidor, id_usuario_seguido) VALUES ($1, $2)",
        [id_seguidor, id_usuario]
      );
      res.json({ message: "Ahora sigues a este usuario", siguiendo: true });
    }
  } catch (err) {
    console.error("Error en seguir/dejar de seguir:", err);
    res.status(500).json({ error: "Error al procesar solicitud" });
  }
});

// RUTA: Verificar si sigue a un usuario
app.get("/api/siguiendo/:id_usuario", async (req, res) => {
  try {
    const { id_usuario } = req.params;
    const { correo } = req.query;

    if (!correo) {
      return res.json({ siguiendo: false });
    }

    const userResult = await pool.query("SELECT id_usuario FROM usuario WHERE correo = $1", [correo]);
    if (userResult.rowCount === 0) {
      return res.json({ siguiendo: false });
    }

    const id_seguidor = userResult.rows[0].id_usuario;

    const result = await pool.query(
      "SELECT * FROM seguimiento WHERE id_usuario_seguidor = $1 AND id_usuario_seguido = $2",
      [id_seguidor, id_usuario]
    );

    res.json({ siguiendo: result.rowCount > 0 });
  } catch (err) {
    console.error("Error verificando seguimiento:", err);
    res.status(500).json({ error: "Error verificando seguimiento" });
  }
});

// RUTA: Obtener estadísticas de seguidores
app.get("/api/usuario/:correo/stats", async (req, res) => {
  try {
    const { correo } = req.params;

    const userResult = await pool.query("SELECT id_usuario FROM usuario WHERE correo = $1", [correo]);
    if (userResult.rowCount === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const id_usuario = userResult.rows[0].id_usuario;

    // Contar seguidores
    const seguidores = await pool.query(
      "SELECT COUNT(*) FROM seguimiento WHERE id_usuario_seguido = $1",
      [id_usuario]
    );

    // Contar seguidos
    const seguidos = await pool.query(
      "SELECT COUNT(*) FROM seguimiento WHERE id_usuario_seguidor = $1",
      [id_usuario]
    );

    res.json({
      seguidores: parseInt(seguidores.rows[0].count),
      seguidos: parseInt(seguidos.rows[0].count)
    });
  } catch (err) {
    console.error("Error obteniendo stats:", err);
    res.status(500).json({ error: "Error obteniendo estadísticas" });
  }
});

// RUTA: Obtener lista de seguidores
app.get("/api/usuario/:correo/seguidores", async (req, res) => {
  try {
    const { correo } = req.params;

    const userResult = await pool.query("SELECT id_usuario FROM usuario WHERE correo = $1", [correo]);
    if (userResult.rowCount === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const id_usuario = userResult.rows[0].id_usuario;

    const result = await pool.query(`
      SELECT u.id_usuario, u.usuario, u.correo, u.foto
      FROM seguimiento s
      JOIN usuario u ON s.id_usuario_seguidor = u.id_usuario
      WHERE s.id_usuario_seguido = $1
      ORDER BY s.id_seguimiento DESC
    `, [id_usuario]);

    res.json(result.rows);
  } catch (err) {
    console.error("Error obteniendo seguidores:", err);
    res.status(500).json({ error: "Error obteniendo seguidores" });
  }
});

// RUTA: Obtener lista de seguidos
app.get("/api/usuario/:correo/seguidos", async (req, res) => {
  try {
    const { correo } = req.params;

    const userResult = await pool.query("SELECT id_usuario FROM usuario WHERE correo = $1", [correo]);
    if (userResult.rowCount === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const id_usuario = userResult.rows[0].id_usuario;

    const result = await pool.query(`
      SELECT u.id_usuario, u.usuario, u.correo, u.foto
      FROM seguimiento s
      JOIN usuario u ON s.id_usuario_seguido = u.id_usuario
      WHERE s.id_usuario_seguidor = $1
      ORDER BY s.id_seguimiento DESC
    `, [id_usuario]);

    res.json(result.rows);
  } catch (err) {
    console.error("Error obteniendo seguidos:", err);
    res.status(500).json({ error: "Error obteniendo seguidos" });
  }
});

// RUTA: Buscar publicaciones
app.get("/api/publicaciones/buscar", async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: "Parámetro de búsqueda vacío" });
    }

    const result = await pool.query(`
      SELECT p.id_publicacion, u.id_usuario, u.usuario, u.correo, u.foto, p.publicacion, p.fecha_pub,
            c.id_cancion, c.nombre AS cancion, c.artista, c.album, c.url_preview, c.imagen_url AS imagen_cancion,
            (SELECT COUNT(*) FROM reaccion WHERE id_publicacion = p.id_publicacion AND tipo = 'like') as likes,
            (SELECT COUNT(*) FROM comentario WHERE id_publicacion = p.id_publicacion) as comentarios
      FROM publicacion p
      JOIN usuario u ON p.id_usuario = u.id_usuario
      LEFT JOIN cancion c ON p.id_cancion = c.id_cancion
      WHERE p.publicacion ILIKE $1 OR u.usuario ILIKE $1
      ORDER BY p.fecha_pub DESC
    `, [`%${q}%`]);

    res.json(result.rows);
  } catch (err) {
    console.error("Error en búsqueda:", err);
    res.status(500).json({ error: "Error en búsqueda de publicaciones" });
  }
});

// RUTA: Ver perfil público de otro usuario
app.get("/api/perfil-publico/:id_usuario", async (req, res) => {
  try {
    const { id_usuario } = req.params;

    const userResult = await pool.query(
      `SELECT id_usuario, usuario, correo, fecha_reg, foto, rol, estado 
      FROM usuario WHERE id_usuario = $1`,
      [id_usuario]
    );

    if (userResult.rowCount === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json(userResult.rows[0]);
  } catch (err) {
    console.error("Error obteniendo perfil público:", err);
    res.status(500).json({ error: "Error obteniendo perfil" });
  }
});

// RUTA: Obtener publicaciones de un usuario (por ID)
app.get("/api/usuario/:id_usuario/publicaciones", async (req, res) => {
  try {
    const { id_usuario } = req.params;

    const result = await pool.query(`
      SELECT p.id_publicacion, u.id_usuario, u.usuario, u.correo, u.foto, p.publicacion, p.fecha_pub,
            c.id_cancion, c.nombre AS cancion, c.artista, c.album, c.url_preview, c.imagen_url AS imagen_cancion,
            (SELECT COUNT(*) FROM reaccion WHERE id_publicacion = p.id_publicacion AND tipo = 'like') as likes,
            (SELECT COUNT(*) FROM comentario WHERE id_publicacion = p.id_publicacion) as comentarios
      FROM publicacion p
      JOIN usuario u ON p.id_usuario = u.id_usuario
      LEFT JOIN cancion c ON p.id_cancion = c.id_cancion
      WHERE u.id_usuario = $1
      ORDER BY p.fecha_pub DESC
    `, [id_usuario]);

    res.json(result.rows);
  } catch (err) {
    console.error("Error obteniendo publicaciones del usuario:", err);
    res.status(500).json({ error: "Error obteniendo publicaciones" });
  }
});

// RUTA: Obtener estadísticas de un usuario (por ID)
app.get("/api/usuario-stats/:id_usuario", async (req, res) => {
  try {
    const { id_usuario } = req.params;

    // Contar seguidores
    const seguidores = await pool.query(
      "SELECT COUNT(*) FROM seguimiento WHERE id_usuario_seguido = $1",
      [id_usuario]
    );

    // Contar seguidos
    const seguidos = await pool.query(
      "SELECT COUNT(*) FROM seguimiento WHERE id_usuario_seguidor = $1",
      [id_usuario]
    );

    res.json({
      seguidores: parseInt(seguidores.rows[0].count),
      seguidos: parseInt(seguidos.rows[0].count)
    });
  } catch (err) {
    console.error("Error obteniendo stats:", err);
    res.status(500).json({ error: "Error obteniendo estadísticas" });
  }
});

// RUTA: Verificar si un usuario sigue a otro (por ID)
app.get("/api/siguiendo-usuario/:id_usuario", async (req, res) => {
  try {
    const { id_usuario } = req.params;
    const { correo } = req.query;

    if (!correo) {
      return res.json({ siguiendo: false });
    }

    const userResult = await pool.query("SELECT id_usuario FROM usuario WHERE correo = $1", [correo]);
    if (userResult.rowCount === 0) {
      return res.json({ siguiendo: false });
    }

    const id_seguidor = userResult.rows[0].id_usuario;

    const result = await pool.query(
      "SELECT * FROM seguimiento WHERE id_usuario_seguidor = $1 AND id_usuario_seguido = $2",
      [id_seguidor, id_usuario]
    );

    res.json({ siguiendo: result.rowCount > 0 });
  } catch (err) {
    console.error("Error verificando seguimiento:", err);
    res.status(500).json({ error: "Error verificando seguimiento" });
  }
});

// RUTA: Reportar publicación
app.post("/api/publicacion/:id/reportar", async (req, res) => {
  try {
    const { id } = req.params;
    const { correo, motivo } = req.body;

    if (!correo || !motivo) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    if (motivo.trim().length < 10) {
      return res.status(400).json({ error: "El motivo debe tener al menos 10 caracteres" });
    }

    const userResult = await pool.query("SELECT id_usuario FROM usuario WHERE correo = $1", [correo]);
    if (userResult.rowCount === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const id_usuario = userResult.rows[0].id_usuario;

    // Verificar si ya reportó esta publicación
    const yaReporto = await pool.query(
      "SELECT * FROM reporte WHERE id_publicacion = $1 AND id_usuario = $2",
      [id, id_usuario]
    );

    if (yaReporto.rowCount > 0) {
      return res.status(400).json({ error: "Ya has reportado esta publicación" });
    }

    // Crear tabla de reportes si no existe
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reporte (
        id_reporte SERIAL PRIMARY KEY,
        id_publicacion INTEGER REFERENCES publicacion(id_publicacion) ON DELETE CASCADE,
        id_usuario INTEGER REFERENCES usuario(id_usuario) ON DELETE CASCADE,
        motivo TEXT NOT NULL,
        fecha_rep TIMESTAMP DEFAULT NOW(),
        estado VARCHAR(20) DEFAULT 'pendiente'
      )
    `);

    await pool.query(
      "INSERT INTO reporte (id_publicacion, id_usuario, motivo, fecha_rep) VALUES ($1, $2, $3, NOW())",
      [id, id_usuario, motivo]
    );

    res.json({ message: "Reporte enviado correctamente" });
  } catch (err) {
    console.error("Error al reportar:", err);
    res.status(500).json({ error: "Error al enviar reporte" });
  }
});

// RUTA: Obtener likes del usuario
app.get("/api/usuario/likes", async (req, res) => {
  try {
    const { correo } = req.query;

    if (!correo) {
      return res.json({ likes: [] });
    }

    const userResult = await pool.query("SELECT id_usuario FROM usuario WHERE correo = $1", [correo]);
    if (userResult.rowCount === 0) {
      return res.json({ likes: [] });
    }

    const id_usuario = userResult.rows[0].id_usuario;

    const result = await pool.query(
      "SELECT id_publicacion FROM reaccion WHERE id_usuario = $1 AND tipo = 'like'",
      [id_usuario]
    );

    const likes = result.rows.map(row => row.id_publicacion);
    res.json({ likes });
  } catch (err) {
    console.error("Error obteniendo likes:", err);
    res.status(500).json({ error: "Error obteniendo likes" });
  }
});

// RUTA: Obtener usuarios ordenados por seguidores (perfiles populares)
app.get("/api/usuarios/populares", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    
    const result = await pool.query(`
      SELECT u.id_usuario, u.usuario, u.correo, u.foto, u.fecha_reg,
             COUNT(s.id_seguimiento) as num_seguidores
      FROM usuario u
      LEFT JOIN seguimiento s ON u.id_usuario = s.id_usuario_seguido
      WHERE u.estado = 'activo'
      GROUP BY u.id_usuario, u.usuario, u.correo, u.foto, u.fecha_reg
      ORDER BY num_seguidores DESC, u.fecha_reg DESC
      LIMIT $1
    `, [limit]);

    res.json(result.rows);
  } catch (err) {
    console.error("Error obteniendo usuarios populares:", err);
    res.status(500).json({ error: "Error obteniendo usuarios populares" });
  }
});

// RUTA: Obtener publicaciones destacadas (más likes)
app.get("/api/publicaciones/destacadas", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    
    const result = await pool.query(`
      SELECT p.id_publicacion, u.id_usuario, u.usuario, u.correo, u.foto, p.publicacion, p.fecha_pub,
             c.id_cancion, c.nombre AS cancion, c.artista, c.album, c.url_preview, c.imagen_url AS imagen_cancion,
             COUNT(DISTINCT r.id_reaccion) as likes,
             COUNT(DISTINCT co.id_comentario) as comentarios
      FROM publicacion p
      JOIN usuario u ON p.id_usuario = u.id_usuario
      LEFT JOIN cancion c ON p.id_cancion = c.id_cancion
      LEFT JOIN reaccion r ON p.id_publicacion = r.id_publicacion AND r.tipo = 'like'
      LEFT JOIN comentario co ON p.id_publicacion = co.id_publicacion
      GROUP BY p.id_publicacion, u.id_usuario, u.usuario, u.correo, u.foto, p.publicacion, p.fecha_pub,
               c.id_cancion, c.nombre, c.artista, c.album, c.url_preview, c.imagen_url
      HAVING COUNT(DISTINCT r.id_reaccion) > 0
      ORDER BY likes DESC, p.fecha_pub DESC
      LIMIT $1
    `, [limit]);

    res.json(result.rows);
  } catch (err) {
    console.error("Error obteniendo publicaciones destacadas:", err);
    res.status(500).json({ error: "Error obteniendo publicaciones destacadas" });
  }
});

// RUTA: Obtener publicaciones de usuarios que sigo
app.get("/api/publicaciones/siguiendo", async (req, res) => {
  try {
    const { correo } = req.query;
    
    if (!correo) {
      return res.status(400).json({ error: "Correo requerido" });
    }

    // Obtener ID del usuario actual
    const userResult = await pool.query("SELECT id_usuario FROM usuario WHERE correo = $1", [correo]);
    if (userResult.rowCount === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const id_usuario = userResult.rows[0].id_usuario;

    const result = await pool.query(`
      SELECT p.id_publicacion, u.id_usuario, u.usuario, u.correo, u.foto, p.publicacion, p.fecha_pub,
             c.id_cancion, c.nombre AS cancion, c.artista, c.album, c.url_preview, c.imagen_url AS imagen_cancion,
             (SELECT COUNT(*) FROM reaccion WHERE id_publicacion = p.id_publicacion AND tipo = 'like') as likes,
             (SELECT COUNT(*) FROM comentario WHERE id_publicacion = p.id_publicacion) as comentarios
      FROM publicacion p
      JOIN usuario u ON p.id_usuario = u.id_usuario
      LEFT JOIN cancion c ON p.id_cancion = c.id_cancion
      WHERE p.id_usuario IN (
        SELECT id_usuario_seguido 
        FROM seguimiento 
        WHERE id_usuario_seguidor = $1
      )
      ORDER BY p.fecha_pub DESC
      LIMIT 50
    `, [id_usuario]);

    res.json(result.rows);
  } catch (err) {
    console.error("Error obteniendo publicaciones de seguidos:", err);
    res.status(500).json({ error: "Error obteniendo publicaciones" });
  }
});

// Servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});