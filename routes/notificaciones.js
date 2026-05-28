// routes/notificaciones.js
const express = require("express");
const router = express.Router();
const pool = require("../utils/database");
const responses = require("../utils/responses");
const { getUserFromEmail } = require("../middleware/auth");

async function crearNotificacion(id_usuario, id_actor, tipo, id_referencia, mensaje) {
  // Nunca notificar a uno mismo
  if (parseInt(id_usuario) === parseInt(id_actor)) return;

  try {
    await pool.query(
      `INSERT INTO notificacion (id_usuario, id_actor, tipo, id_referencia, mensaje, leido, fecha)
       VALUES ($1, $2, $3, $4, $5, false, NOW())`,
      [id_usuario, id_actor, tipo, id_referencia, mensaje]
    );
  } catch (err) {
    // No romper el flujo principal si falla la notificación
    console.error("Error creando notificación:", err.message);
  }
}

router.get("/", getUserFromEmail, async (req, res) => {
  const id_usuario = req.user.id_usuario;
  const limite = Math.min(parseInt(req.query.limite) || 30, 100);

  try {
    const result = await pool.query(
      `SELECT
         n.id_notificacion,
         n.tipo,
         n.id_referencia,
         n.mensaje,
         n.leido,
         n.fecha,
         u.id_usuario  AS actor_id,
         u.usuario     AS actor_nombre,
         u.foto        AS actor_foto
       FROM notificacion n
       JOIN usuario u ON n.id_actor = u.id_usuario
       WHERE n.id_usuario = $1
       ORDER BY n.fecha DESC
       LIMIT $2`,
      [id_usuario, limite]
    );

    return res.json(result.rows);
  } catch (err) {
    console.error("Error obteniendo notificaciones:", err);
    return responses.error(res, "Error al obtener notificaciones");
  }
});

// ─────────────────────────────────────────────
// GET /api/notificaciones/no-leidas
// Devuelve el conteo de notificaciones sin leer
// ─────────────────────────────────────────────
router.get("/no-leidas", getUserFromEmail, async (req, res) => {
  const id_usuario = req.user.id_usuario;

  try {
    const result = await pool.query(
      "SELECT COUNT(*) AS total FROM notificacion WHERE id_usuario = $1 AND leido = false",
      [id_usuario]
    );
    return res.json({ total: parseInt(result.rows[0].total) });
  } catch (err) {
    console.error("Error contando no leídas:", err);
    return responses.error(res, "Error al contar notificaciones");
  }
});

// ─────────────────────────────────────────────
// PUT /api/notificaciones/leer-todas
// Marcar todas las notificaciones como leídas
// ─────────────────────────────────────────────
// IMPORTANTE: Esta ruta debe ir ANTES de /:id/leer para que Express no confunda
// "leer-todas" con un :id
router.put("/leer-todas", getUserFromEmail, async (req, res) => {
  const id_usuario = req.user.id_usuario;

  try {
    await pool.query(
      "UPDATE notificacion SET leido = true WHERE id_usuario = $1 AND leido = false",
      [id_usuario]
    );
    return res.json({ message: "Todas las notificaciones marcadas como leídas" });
  } catch (err) {
    console.error("Error marcando todas:", err);
    return responses.error(res, "Error al actualizar notificaciones");
  }
});

// ─────────────────────────────────────────────
// PUT /api/notificaciones/:id/leer
// Marcar una notificación específica como leída
// ─────────────────────────────────────────────
router.put("/:id/leer", getUserFromEmail, async (req, res) => {
  const { id } = req.params;
  const id_usuario = req.user.id_usuario;

  try {
    await pool.query(
      "UPDATE notificacion SET leido = true WHERE id_notificacion = $1 AND id_usuario = $2",
      [id, id_usuario]
    );
    return res.json({ message: "Notificación leída" });
  } catch (err) {
    console.error("Error marcando notificación:", err);
    return responses.error(res, "Error al marcar notificación");
  }
});

// ─────────────────────────────────────────────
// DELETE /api/notificaciones/:id
// Eliminar una notificación
// ─────────────────────────────────────────────
router.delete("/:id", getUserFromEmail, async (req, res) => {
  const { id } = req.params;
  const id_usuario = req.user.id_usuario;

  try {
    await pool.query(
      "DELETE FROM notificacion WHERE id_notificacion = $1 AND id_usuario = $2",
      [id, id_usuario]
    );
    return res.json({ message: "Notificación eliminada" });
  } catch (err) {
    console.error("Error eliminando notificación:", err);
    return responses.error(res, "Error al eliminar notificación");
  }
});

// Exportar el router y el helper para usarlo en otros routes
module.exports = router;
module.exports.crearNotificacion = crearNotificacion;