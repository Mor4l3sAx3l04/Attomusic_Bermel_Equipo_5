// routes/users.js
const express = require("express");
const router = express.Router();
const pool = require("../utils/database");
const responses = require("../utils/responses");
const queries = require("../utils/queries");
const { getUserFromEmail } = require("../middleware/auth");

// RUTA: Obtener perfil del usuario
router.get("/perfil/:correo", async (req, res) => {
  try {
    const { correo } = req.params;

    const userResult = await pool.query(
      `SELECT id_usuario, usuario, correo, fecha_reg, foto, rol, estado 
      FROM usuario WHERE correo = $1`,
      [correo]
    );

    if (userResult.rowCount === 0) {
      return responses.notFound(res, "Usuario");
    }

    return res.json(userResult.rows[0]);
  } catch (err) {
    console.error("Error obteniendo perfil:", err);
    return responses.error(res, "Error obteniendo perfil");
  }
});

// RUTA: Ver perfil público de otro usuario (por ID)
router.get("/perfil-publico/:id_usuario", async (req, res) => {
  try {
    const { id_usuario } = req.params;

    const userResult = await pool.query(
      `SELECT id_usuario, usuario, correo, fecha_reg, foto, rol, estado 
      FROM usuario WHERE id_usuario = $1`,
      [id_usuario]
    );

    if (userResult.rowCount === 0) {
      return responses.notFound(res, "Usuario");
    }

    return res.json(userResult.rows[0]);
  } catch (err) {
    console.error("Error obteniendo perfil público:", err);
    return responses.error(res, "Error obteniendo perfil");
  }
});

// RUTA: Actualizar perfil del usuario
router.put("/perfil", getUserFromEmail, async (req, res) => {
  try {
    const { nuevoUsuario, nuevoCorreo, foto } = req.body;
    const correo = req.user.correo;

    // Verificar si el nuevo correo ya existe
    if (nuevoCorreo && nuevoCorreo !== correo) {
      const existe = await pool.query(
        "SELECT id_usuario FROM usuario WHERE correo = $1",
        [nuevoCorreo]
      );
      if (existe.rowCount > 0) {
        return responses.badRequest(res, "El correo ya está en uso");
      }
    }

    // Verificar si el nuevo usuario ya existe
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
          return responses.badRequest(res, "El nombre de usuario ya está en uso");
        }
      }
    }

    // Construir query dinámica
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
      return responses.badRequest(res, "No hay datos para actualizar");
    }

    values.push(correo);
    const query = `UPDATE usuario SET ${updates.join(", ")} WHERE correo = $${paramCounter}`;

    await pool.query(query, values);

    return res.json({ message: "Perfil actualizado correctamente" });
  } catch (err) {
    console.error("Error actualizando perfil:", err);
    return responses.error(res, "Error actualizando perfil");
  }
});

// RUTA: Obtener publicaciones del usuario (por correo)
router.get("/perfil/:correo/publicaciones", async (req, res) => {
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

    return res.json(result.rows);
  } catch (err) {
    console.error("Error obteniendo publicaciones del usuario:", err);
    return responses.error(res, "Error obteniendo publicaciones");
  }
});

// RUTA: Obtener publicaciones de un usuario (por ID)
router.get("/usuario/:id_usuario/publicaciones", async (req, res) => {
  try {
    const { id_usuario } = req.params;
    const result = await pool.query(queries.getPostsByUserId, [id_usuario]);
    return res.json(result.rows);
  } catch (err) {
    console.error("Error obteniendo publicaciones del usuario:", err);
    return responses.error(res, "Error obteniendo publicaciones");
  }
});

// RUTA: Seguir/Dejar de seguir usuario
router.post("/seguir/:id_usuario", getUserFromEmail, async (req, res) => {
  try {
    const { id_usuario } = req.params;
    const id_seguidor = req.user.id_usuario;

    // No puede seguirse a sí mismo
    if (parseInt(id_seguidor) === parseInt(id_usuario)) {
      return responses.badRequest(res, "No puedes seguirte a ti mismo");
    }

    // Verificar si ya lo sigue
    const existeSeguimiento = await pool.query(queries.checkFollow, [id_seguidor, id_usuario]);

    if (existeSeguimiento.rowCount > 0) {
      // Dejar de seguir
      await pool.query(queries.removeFollow, [id_seguidor, id_usuario]);
      return res.json({ message: "Dejaste de seguir", siguiendo: false });
    } else {
      // Seguir
      await pool.query(queries.addFollow, [id_seguidor, id_usuario]);
      return res.json({ message: "Ahora sigues a este usuario", siguiendo: true });
    }
  } catch (err) {
    console.error("Error en seguir/dejar de seguir:", err);
    return responses.error(res, "Error al procesar solicitud");
  }
});

// RUTA: Verificar si sigue a un usuario
router.get("/siguiendo/:id_usuario", async (req, res) => {
  try {
    const { id_usuario } = req.params;
    const { correo } = req.query;

    if (!correo) {
      return res.json({ siguiendo: false });
    }

    const userResult = await pool.query(queries.getUserIdByEmail, [correo]);
    if (userResult.rowCount === 0) {
      return res.json({ siguiendo: false });
    }

    const id_seguidor = userResult.rows[0].id_usuario;

    const result = await pool.query(queries.checkFollow, [id_seguidor, id_usuario]);

    return res.json({ siguiendo: result.rowCount > 0 });
  } catch (err) {
    console.error("Error verificando seguimiento:", err);
    return responses.error(res, "Error verificando seguimiento");
  }
});

// RUTA: Verificar si sigue a un usuario (por ID)
router.get("/siguiendo-usuario/:id_usuario", async (req, res) => {
  try {
    const { id_usuario } = req.params;
    const { correo } = req.query;

    if (!correo) {
      return res.json({ siguiendo: false });
    }

    const userResult = await pool.query(queries.getUserIdByEmail, [correo]);
    if (userResult.rowCount === 0) {
      return res.json({ siguiendo: false });
    }

    const id_seguidor = userResult.rows[0].id_usuario;

    const result = await pool.query(queries.checkFollow, [id_seguidor, id_usuario]);

    return res.json({ siguiendo: result.rowCount > 0 });
  } catch (err) {
    console.error("Error verificando seguimiento:", err);
    return responses.error(res, "Error verificando seguimiento");
  }
});

// RUTA: Obtener estadísticas de seguidores (por correo)
router.get("/usuario/:correo/stats", async (req, res) => {
  try {
    const { correo } = req.params;

    const userResult = await pool.query(queries.getUserIdByEmail, [correo]);
    if (userResult.rowCount === 0) {
      return responses.notFound(res, "Usuario");
    }

    const id_usuario = userResult.rows[0].id_usuario;

    const seguidores = await pool.query(queries.countFollowers, [id_usuario]);
    const seguidos = await pool.query(queries.countFollowing, [id_usuario]);

    return res.json({
      seguidores: parseInt(seguidores.rows[0].count),
      seguidos: parseInt(seguidos.rows[0].count)
    });
  } catch (err) {
    console.error("Error obteniendo stats:", err);
    return responses.error(res, "Error obteniendo estadísticas");
  }
});

// RUTA: Obtener estadísticas de un usuario (por ID)
router.get("/usuario-stats/:id_usuario", async (req, res) => {
  try {
    const { id_usuario } = req.params;

    const seguidores = await pool.query(queries.countFollowers, [id_usuario]);
    const seguidos = await pool.query(queries.countFollowing, [id_usuario]);

    return res.json({
      seguidores: parseInt(seguidores.rows[0].count),
      seguidos: parseInt(seguidos.rows[0].count)
    });
  } catch (err) {
    console.error("Error obteniendo stats:", err);
    return responses.error(res, "Error obteniendo estadísticas");
  }
});

// RUTA: Obtener lista de seguidores
router.get("/usuario/:correo/seguidores", async (req, res) => {
  try {
    const { correo } = req.params;

    const userResult = await pool.query(queries.getUserIdByEmail, [correo]);
    if (userResult.rowCount === 0) {
      return responses.notFound(res, "Usuario");
    }

    const id_usuario = userResult.rows[0].id_usuario;

    const result = await pool.query(queries.getFollowers, [id_usuario]);

    return res.json(result.rows);
  } catch (err) {
    console.error("Error obteniendo seguidores:", err);
    return responses.error(res, "Error obteniendo seguidores");
  }
});

// RUTA: Obtener lista de seguidos
router.get("/usuario/:correo/seguidos", async (req, res) => {
  try {
    const { correo } = req.params;

    const userResult = await pool.query(queries.getUserIdByEmail, [correo]);
    if (userResult.rowCount === 0) {
      return responses.notFound(res, "Usuario");
    }

    const id_usuario = userResult.rows[0].id_usuario;

    const result = await pool.query(queries.getFollowing, [id_usuario]);

    return res.json(result.rows);
  } catch (err) {
    console.error("Error obteniendo seguidos:", err);
    return responses.error(res, "Error obteniendo seguidos");
  }
});

// RUTA: Obtener usuarios populares
router.get("/usuarios/populares", async (req, res) => {
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

    return res.json(result.rows);
  } catch (err) {
    console.error("Error obteniendo usuarios populares:", err);
    return responses.error(res, "Error obteniendo usuarios populares");
  }
});

module.exports = router;