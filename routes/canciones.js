// routes/canciones.js
const express = require("express");
const router = express.Router();
const pool = require("../utils/database");
const responses = require("../utils/responses");
const { getUserFromEmail } = require("../middleware/auth");

// ==========================================
// CALIFICACIONES
// ==========================================

// Obtener calificación promedio y detalles de una canción
router.get("/:idCancion/calificaciones", async (req, res) => {
  const { idCancion } = req.params;
  
  try {
    const statsResult = await pool.query(
      `SELECT 
        COUNT(*) as total_calificaciones,
        ROUND(AVG(calificacion)::numeric, 1) as promedio_calificacion
      FROM calificaciones 
      WHERE id_cancion = $1`,
      [idCancion]
    );

    const stats = statsResult.rows[0];
    
    // Distribución por estrellas
    const distribucionResult = await pool.query(
      `SELECT calificacion, COUNT(*) as cantidad
       FROM calificaciones
       WHERE id_cancion = $1
       GROUP BY calificacion
       ORDER BY calificacion DESC`,
      [idCancion]
    );

    return res.json({
      promedio: parseFloat(stats.promedio_calificacion) || 0,
      total: parseInt(stats.total_calificaciones) || 0,
      distribucion: distribucionResult.rows
    });
  } catch (err) {
    console.error("Error obteniendo calificaciones:", err);
    return responses.error(res, "Error al obtener calificaciones");
  }
});

// Obtener calificación del usuario actual
router.get("/:idCancion/calificaciones/usuario", getUserFromEmail, async (req, res) => {
  const { idCancion } = req.params;
  const userId = req.user.id_usuario;

  try {
    const result = await pool.query(
      "SELECT calificacion FROM calificaciones WHERE id_cancion = $1 AND id_usuario = $2",
      [idCancion, userId]
    );

    if (result.rows.length === 0) {
      return res.json({ calificacion: null });
    }

    return res.json({ calificacion: result.rows[0].calificacion });
  } catch (err) {
    console.error("Error obteniendo calificación del usuario:", err);
    return responses.error(res, "Error al obtener calificación");
  }
});

// Agregar/actualizar calificación
router.post("/:idCancion/calificaciones", getUserFromEmail, async (req, res) => {
  const { idCancion } = req.params;
  const { calificacion } = req.body;
  const userId = req.user.id_usuario;

  if (!calificacion || calificacion < 1 || calificacion > 5) {
    return res.status(400).json({ error: "Calificación inválida (debe ser 1-5)" });
  }

  try {
    // Insertar o actualizar (UPSERT)
    const result = await pool.query(
      `INSERT INTO calificaciones (id_cancion, id_usuario, calificacion)
       VALUES ($1, $2, $3)
       ON CONFLICT (id_cancion, id_usuario)
       DO UPDATE SET calificacion = $3, fecha_creacion = CURRENT_TIMESTAMP
       RETURNING *`,
      [idCancion, userId, calificacion]
    );

    return res.json({
      success: true,
      message: "Calificación guardada exitosamente",
      calificacion: result.rows[0]
    });
  } catch (err) {
    console.error("Error guardando calificación:", err);
    return responses.error(res, "Error al guardar calificación");
  }
});

// ==========================================
// COMENTARIOS
// ==========================================

// Obtener comentarios de una canción
router.get("/:idCancion/comentarios", async (req, res) => {
  const { idCancion } = req.params;
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;

  try {
    const result = await pool.query(
      `SELECT 
        c.id_comentario,
        c.comentario,
        c.fecha_creacion,
        u.usuario as nombre,
        u.foto as foto_perfil
       FROM comentarios_canciones c
       JOIN usuario u ON c.id_usuario = u.id_usuario
       WHERE c.id_cancion = $1
       ORDER BY c.fecha_creacion DESC
       LIMIT $2 OFFSET $3`,
      [idCancion, limit, offset]
    );

    const countResult = await pool.query(
      "SELECT COUNT(*) as total FROM comentarios_canciones WHERE id_cancion = $1",
      [idCancion]
    );

    return res.json({
      comentarios: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit,
      offset
    });
  } catch (err) {
    console.error("Error obteniendo comentarios:", err);
    return responses.error(res, "Error al obtener comentarios");
  }
});

// Agregar comentario
router.post("/:idCancion/comentarios", getUserFromEmail, async (req, res) => {
  const { idCancion } = req.params;
  const { comentario } = req.body;
  const userId = req.user.id_usuario;

  if (!comentario || comentario.trim().length === 0) {
    return res.status(400).json({ error: "El comentario no puede estar vacío" });
  }

  if (comentario.length > 1000) {
    return res.status(400).json({ error: "El comentario es demasiado largo (máx. 1000 caracteres)" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO comentarios_canciones (id_cancion, id_usuario, comentario)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [idCancion, userId, comentario.trim()]
    );

    // Obtener info del usuario para devolver
    const userResult = await pool.query(
      "SELECT usuario, foto FROM usuario WHERE id_usuario = $1",
      [userId]
    );

    return res.json({
      success: true,
      message: "Comentario agregado exitosamente",
      comentario: {
        ...result.rows[0],
        nombre: userResult.rows[0].usuario,
        foto_perfil: userResult.rows[0].foto
      }
    });
  } catch (err) {
    console.error("Error guardando comentario:", err);
    return responses.error(res, "Error al guardar comentario");
  }
});

// Eliminar comentario (solo el dueño o admin)
router.delete("/comentarios/:idComentario", getUserFromEmail, async (req, res) => {
  const { idComentario } = req.params;
  const userId = req.user.id_usuario;

  try {
    // Verificar si el comentario pertenece al usuario
    const checkResult = await pool.query(
      "SELECT id_usuario FROM comentarios_canciones WHERE id_comentario = $1",
      [idComentario]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: "Comentario no encontrado" });
    }

    if (checkResult.rows[0].id_usuario !== parseInt(userId)) {
      return res.status(403).json({ error: "No tienes permisos para eliminar este comentario" });
    }

    await pool.query("DELETE FROM comentarios_canciones WHERE id_comentario = $1", [idComentario]);

    return res.json({
      success: true,
      message: "Comentario eliminado exitosamente"
    });
  } catch (err) {
    console.error("Error eliminando comentario:", err);
    return responses.error(res, "Error al eliminar comentario");
  }
});

module.exports = router;