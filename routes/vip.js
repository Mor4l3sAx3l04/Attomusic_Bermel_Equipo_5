// routes/vip.js
const express = require('express');
const router = express.Router();
const pool = require('../utils/database');
const responses = require('../utils/responses');
const { getUserFromEmail } = require('../middleware/auth');

// GET /api/vip/estado
router.get('/estado', async (req, res) => {
  const correo = req.query.correo || req.get('x-user-email');
  if (!correo) return responses.badRequest(res, 'Correo requerido');
  try {
    const r = await pool.query(
      'SELECT es_vip, insignia_artista, rol FROM usuario WHERE correo = $1', [correo]
    );
    if (r.rowCount === 0) return responses.notFound(res, 'Usuario');
    const u = r.rows[0];
    return res.json({
      es_vip: u.es_vip || u.rol === 'admin',
      insignia_artista: u.insignia_artista || false,
      es_admin: u.rol === 'admin'
    });
  } catch (err) {
    console.error('Error verificando VIP:', err);
    return responses.error(res, 'Error verificando estado VIP');
  }
});

// POST /api/vip/activar - Simular activación VIP
router.post('/activar', getUserFromEmail, async (req, res) => {
  const { correo } = req.user;
  try {
    const r = await pool.query('SELECT rol, es_vip FROM usuario WHERE correo = $1', [correo]);
    const u = r.rows[0];
    if (u.rol === 'admin' || u.es_vip) {
      return res.json({ message: 'Ya tienes AttoPlus activo', es_vip: true });
    }
    await pool.query('UPDATE usuario SET es_vip = true WHERE correo = $1', [correo]);
    return res.json({ message: '¡Bienvenido a AttoPlus! Ahora eres VIP.', es_vip: true });
  } catch (err) {
    console.error('Error activando VIP:', err);
    return responses.error(res, 'Error activando VIP');
  }
});

// DELETE /api/vip/cancelar
router.delete('/cancelar', getUserFromEmail, async (req, res) => {
  const { correo } = req.user;
  try {
    const r = await pool.query('SELECT rol FROM usuario WHERE correo = $1', [correo]);
    if (r.rows[0].rol === 'admin') {
      return responses.badRequest(res, 'Los administradores no pueden cancelar su VIP');
    }
    await pool.query('UPDATE usuario SET es_vip = false WHERE correo = $1', [correo]);
    return res.json({
      message: 'VIP cancelado. Tus canciones e insignia de artista se mantienen.',
      es_vip: false
    });
  } catch (err) {
    console.error('Error cancelando VIP:', err);
    return responses.error(res, 'Error cancelando VIP');
  }
});

module.exports = router;
