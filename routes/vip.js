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
      'SELECT es_vip, insignia_artista, rol, tipo_plan FROM usuario WHERE correo = $1', [correo]
    );
    if (r.rowCount === 0) return responses.notFound(res, 'Usuario');
    const u = r.rows[0];
    const esAdmin = u.rol === 'admin';
    return res.json({
      es_vip: u.es_vip || esAdmin,
      es_elite: u.tipo_plan === 'attoelite' || esAdmin,
      tipo_plan: esAdmin ? 'attoelite' : (u.tipo_plan || null),
      insignia_artista: u.insignia_artista || false,
      es_admin: esAdmin
    });
  } catch (err) {
    console.error('Error verificando VIP:', err);
    return responses.error(res, 'Error verificando estado VIP');
  }
});

// POST /api/vip/activar - Activar AttoElite
router.post('/activar', getUserFromEmail, async (req, res) => {
  const { correo } = req.user;
  const { plan } = req.body;

  if (plan !== 'attoelite') {
    return responses.badRequest(res, 'Plan inválido. El único plan disponible es "attoelite"');
  }

  try {
    const r = await pool.query('SELECT rol, es_vip, tipo_plan FROM usuario WHERE correo = $1', [correo]);
    if (r.rowCount === 0) return responses.notFound(res, 'Usuario');
    const u = r.rows[0];

    if (u.rol === 'admin') {
      return res.json({ message: 'Los administradores tienen acceso completo', es_vip: true, tipo_plan: 'attoelite' });
    }

    if (u.tipo_plan === 'attoelite') {
      return responses.badRequest(res, 'Ya tienes AttoElite activo.');
    }

    await pool.query(
      'UPDATE usuario SET es_vip = true, tipo_plan = $1 WHERE correo = $2',
      [plan, correo]
    );

    return res.json({
      message: '¡Bienvenido a AttoElite! Ya tienes acceso a todos los beneficios exclusivos.',
      es_vip: true,
      tipo_plan: 'attoelite'
    });
  } catch (err) {
    console.error('Error activando plan:', err);
    return responses.error(res, 'Error activando plan');
  }
});

// DELETE /api/vip/cancelar
router.delete('/cancelar', getUserFromEmail, async (req, res) => {
  const { correo } = req.user;
  try {
    const r = await pool.query('SELECT rol, tipo_plan FROM usuario WHERE correo = $1', [correo]);
    if (r.rowCount === 0) return responses.notFound(res, 'Usuario');
    const u = r.rows[0];

    if (u.rol === 'admin') {
      return responses.badRequest(res, 'Los administradores no pueden cancelar su plan');
    }

    if (!u.tipo_plan) {
      return responses.badRequest(res, 'No tienes ningún plan activo');
    }

    await pool.query('UPDATE usuario SET es_vip = false, tipo_plan = NULL WHERE correo = $1', [correo]);

    return res.json({
      message: 'AttoElite cancelado. Tu insignia de artista y canciones se mantienen.',
      es_vip: false,
      tipo_plan: null
    });
  } catch (err) {
    console.error('Error cancelando plan:', err);
    return responses.error(res, 'Error cancelando plan');
  }
});

// POST /api/vip/cambiar - (reservado para uso futuro)
router.post('/cambiar', getUserFromEmail, async (req, res) => {
  return responses.badRequest(res, 'Solo existe el plan AttoElite. Usa /activar para suscribirte.');
});

module.exports = router;
