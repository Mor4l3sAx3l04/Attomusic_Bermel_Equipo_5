// routes/mercancia.js
const express = require('express');
const router = express.Router();
const pool = require('../utils/database');
const responses = require('../utils/responses');
const { getUserFromEmail, requireAdmin } = require('../middleware/auth');

async function requireEliteOrAdmin(req, res, next) {
  const correo = req.body.correo || req.query.correo || req.get('x-user-email');
  if (!correo) return responses.unauthorized(res, 'Usuario no autenticado');
  try {
    const r = await pool.query(
      'SELECT id_usuario, tipo_plan, rol FROM usuario WHERE correo = $1', [correo]
    );
    if (r.rowCount === 0) return responses.notFound(res, 'Usuario');
    const u = r.rows[0];
    if (u.tipo_plan !== 'attoelite' && u.rol !== 'admin') {
      return responses.forbidden(res, 'Se requiere AttoElite para esta acción');
    }
    req.user = { id_usuario: u.id_usuario, correo, rol: u.rol };
    next();
  } catch (err) {
    console.error('Error en requireEliteOrAdmin:', err);
    return responses.error(res, 'Error verificando permisos');
  }
}

// GET /api/mercancia/anuncios — productos aleatorios para sidebar (antes que /:id)
router.get('/anuncios', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT m.id_mercancia, m.id_usuario, m.nombre, m.precio,
             m.imagen, m.imagen_zoom, m.imagen_offset_x, m.imagen_offset_y, m.es_admin,
             u.usuario, pa.nombre_artistico
      FROM mercancia m
      LEFT JOIN usuario u ON m.id_usuario = u.id_usuario
      LEFT JOIN pagina_artista pa ON m.id_usuario = pa.id_usuario
      WHERE m.activo = TRUE AND m.stock > 0
      ORDER BY RANDOM() LIMIT 4
    `);
    return res.json(result.rows);
  } catch (err) {
    console.error('Error obteniendo anuncios de mercancía:', err);
    return responses.error(res, 'Error obteniendo anuncios');
  }
});

// GET /api/mercancia/todos — admin: todos los productos de todos los artistas
router.get('/todos', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT m.*,
             u.usuario, pa.nombre_artistico,
             (SELECT COALESCE(SUM(omi.cantidad), 0)
              FROM orden_mercancia_item omi WHERE omi.id_mercancia = m.id_mercancia
             )::INT AS total_vendido
      FROM mercancia m
      LEFT JOIN usuario u ON m.id_usuario = u.id_usuario
      LEFT JOIN pagina_artista pa ON m.id_usuario = pa.id_usuario
      ORDER BY m.es_admin DESC, u.usuario ASC NULLS LAST, m.fecha_creacion DESC
    `);
    return res.json(result.rows);
  } catch (err) {
    console.error('Error obteniendo todos los productos:', err);
    return responses.error(res, 'Error obteniendo productos');
  }
});

// GET /api/mercancia/ventas/:id_usuario — estadísticas de ventas del artista
router.get('/ventas/:id_usuario', async (req, res) => {
  const { id_usuario } = req.params;
  const correo = req.query.correo || req.get('x-user-email');
  if (!correo) return responses.unauthorized(res, 'No autenticado');
  try {
    const uCheck = await pool.query('SELECT id_usuario, rol FROM usuario WHERE correo = $1', [correo]);
    if (uCheck.rowCount === 0) return responses.unauthorized(res, 'No autenticado');
    const me = uCheck.rows[0];
    if (String(me.id_usuario) !== String(id_usuario) && me.rol !== 'admin') {
      return responses.forbidden(res, 'Sin acceso a estas estadísticas');
    }

    const resumen = await pool.query(`
      SELECT
        COALESCE(SUM(omi.subtotal), 0)::FLOAT  AS ingresos_totales,
        COUNT(DISTINCT omi.id_orden)::INT        AS total_ordenes,
        COALESCE(SUM(omi.cantidad), 0)::INT      AS unidades_vendidas
      FROM orden_mercancia_item omi
      JOIN mercancia m ON omi.id_mercancia = m.id_mercancia
      WHERE m.id_usuario = $1
    `, [id_usuario]);

    const porProducto = await pool.query(`
      SELECT m.nombre,
             SUM(omi.cantidad)::INT    AS unidades,
             SUM(omi.subtotal)::FLOAT  AS ingresos
      FROM orden_mercancia_item omi
      JOIN mercancia m ON omi.id_mercancia = m.id_mercancia
      WHERE m.id_usuario = $1
      GROUP BY m.id_mercancia, m.nombre
      ORDER BY unidades DESC LIMIT 8
    `, [id_usuario]);

    const porMes = await pool.query(`
      SELECT TO_CHAR(om.fecha_orden, 'YYYY-MM')  AS mes,
             SUM(omi.subtotal)::FLOAT             AS ingresos,
             SUM(omi.cantidad)::INT               AS unidades
      FROM orden_mercancia_item omi
      JOIN orden_mercancia om ON omi.id_orden = om.id_orden
      JOIN mercancia m ON omi.id_mercancia = m.id_mercancia
      WHERE m.id_usuario = $1 AND om.fecha_orden >= NOW() - INTERVAL '6 months'
      GROUP BY mes ORDER BY mes ASC
    `, [id_usuario]);

    return res.json({
      resumen: resumen.rows[0],
      por_producto: porProducto.rows,
      por_mes: porMes.rows
    });
  } catch (err) {
    console.error('Error obteniendo ventas:', err);
    return responses.error(res, 'Error obteniendo estadísticas de ventas');
  }
});

// GET /api/mercancia/usuario/:id_usuario — productos del artista + productos admin
router.get('/usuario/:id_usuario', async (req, res) => {
  const { id_usuario } = req.params;
  try {
    const result = await pool.query(`
      SELECT m.*, u.usuario, pa.nombre_artistico
      FROM mercancia m
      LEFT JOIN usuario u ON m.id_usuario = u.id_usuario
      LEFT JOIN pagina_artista pa ON m.id_usuario = pa.id_usuario
      WHERE (m.id_usuario = $1 OR m.es_admin = TRUE) AND m.activo = TRUE
      ORDER BY m.es_admin DESC, m.fecha_creacion DESC
    `, [id_usuario]);
    return res.json(result.rows);
  } catch (err) {
    console.error('Error obteniendo mercancía:', err);
    return responses.error(res, 'Error obteniendo mercancía');
  }
});

// POST /api/mercancia — crear producto (AttoElite o admin)
router.post('/', requireEliteOrAdmin, async (req, res) => {
  const {
    nombre, descripcion, precio, imagen,
    imagen_zoom, imagen_offset_x, imagen_offset_y,
    stock, es_admin
  } = req.body;

  if (!nombre?.trim()) return responses.badRequest(res, 'El nombre del producto es requerido');
  if (!precio || isNaN(parseFloat(precio))) return responses.badRequest(res, 'El precio es requerido');
  if (parseFloat(precio) <= 0) return responses.badRequest(res, 'El precio debe ser mayor a 0');

  const esAdminProd = req.user.rol === 'admin' && es_admin === true;

  try {
    const result = await pool.query(`
      INSERT INTO mercancia
        (id_usuario, nombre, descripcion, precio, imagen,
         imagen_zoom, imagen_offset_x, imagen_offset_y, stock, es_admin)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *
    `, [
      req.user.id_usuario,
      nombre.trim(),
      descripcion || null,
      parseFloat(precio),
      imagen || null,
      parseFloat(imagen_zoom) || 1.0,
      parseFloat(imagen_offset_x) || 0,
      parseFloat(imagen_offset_y) || 0,
      Math.max(0, parseInt(stock, 10) || 0),
      esAdminProd
    ]);
    return res.json({ message: 'Producto creado exitosamente', mercancia: result.rows[0] });
  } catch (err) {
    console.error('Error creando producto:', err);
    return responses.error(res, 'Error creando producto');
  }
});

// POST /api/mercancia/orden — crear orden de compra (cualquier usuario logueado)
router.post('/orden', getUserFromEmail, async (req, res) => {
  const {
    nombre_comprador, email_comprador, direccion, ciudad,
    estado_envio, codigo_postal, pais,
    metodo_pago, ultimos_4_tarjeta, notas, items
  } = req.body;

  if (!nombre_comprador || !direccion || !metodo_pago) {
    return responses.badRequest(res, 'Nombre, dirección y método de pago son requeridos');
  }
  if (!Array.isArray(items) || items.length === 0) {
    return responses.badRequest(res, 'El carrito está vacío');
  }

  try {
    let total = 0;
    const verified = [];

    for (const item of items) {
      const p = await pool.query(
        'SELECT id_mercancia, nombre, precio, stock FROM mercancia WHERE id_mercancia = $1 AND activo = TRUE',
        [item.id_mercancia]
      );
      if (!p.rowCount) {
        return responses.badRequest(res, `Producto no encontrado (ID: ${item.id_mercancia})`);
      }
      const prod = p.rows[0];
      const cant = Math.max(1, parseInt(item.cantidad, 10) || 1);
      if (prod.stock < cant) {
        return responses.badRequest(res, `Stock insuficiente para "${prod.nombre}" (disponible: ${prod.stock})`);
      }
      const sub = parseFloat(prod.precio) * cant;
      total += sub;
      verified.push({
        id_mercancia: prod.id_mercancia,
        nombre: prod.nombre,
        precio: prod.precio,
        cantidad: cant,
        subtotal: sub
      });
    }

    const ordenR = await pool.query(`
      INSERT INTO orden_mercancia
        (id_usuario_comprador, nombre_comprador, email_comprador,
         direccion, ciudad, estado_envio, codigo_postal, pais,
         metodo_pago, ultimos_4_tarjeta, total, notas)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id_orden
    `, [
      req.user.id_usuario, nombre_comprador, email_comprador || null,
      direccion, ciudad || null, estado_envio || null,
      codigo_postal || null, pais || 'México',
      metodo_pago, ultimos_4_tarjeta || null, total, notas || null
    ]);

    const id_orden = ordenR.rows[0].id_orden;

    for (const v of verified) {
      await pool.query(`
        INSERT INTO orden_mercancia_item
          (id_orden, id_mercancia, nombre_producto, precio_unitario, cantidad, subtotal)
        VALUES ($1,$2,$3,$4,$5,$6)
      `, [id_orden, v.id_mercancia, v.nombre, v.precio, v.cantidad, v.subtotal]);

      await pool.query(
        'UPDATE mercancia SET stock = stock - $1 WHERE id_mercancia = $2',
        [v.cantidad, v.id_mercancia]
      );
    }

    return res.json({ message: 'Orden creada exitosamente', id_orden, total });
  } catch (err) {
    console.error('Error procesando orden:', err);
    return responses.error(res, 'Error procesando la orden');
  }
});

// PUT /api/mercancia/:id — editar producto
router.put('/:id', requireEliteOrAdmin, async (req, res) => {
  const { id } = req.params;
  const {
    nombre, descripcion, precio, imagen,
    imagen_zoom, imagen_offset_x, imagen_offset_y,
    stock, es_admin, activo
  } = req.body;

  try {
    const check = await pool.query(
      'SELECT id_usuario FROM mercancia WHERE id_mercancia = $1', [id]
    );
    if (!check.rowCount) return responses.notFound(res, 'Producto');
    if (check.rows[0].id_usuario !== req.user.id_usuario && req.user.rol !== 'admin') {
      return responses.forbidden(res, 'Sin permiso para editar este producto');
    }

    const sets = [], vals = [];
    let idx = 1;

    if (nombre !== undefined)         { sets.push(`nombre=$${idx++}`);          vals.push(nombre.trim()); }
    if (descripcion !== undefined)    { sets.push(`descripcion=$${idx++}`);     vals.push(descripcion); }
    if (precio !== undefined)         { sets.push(`precio=$${idx++}`);          vals.push(parseFloat(precio)); }
    if (imagen !== undefined)         { sets.push(`imagen=$${idx++}`);          vals.push(imagen); }
    if (imagen_zoom !== undefined)    { sets.push(`imagen_zoom=$${idx++}`);     vals.push(parseFloat(imagen_zoom)); }
    if (imagen_offset_x !== undefined){ sets.push(`imagen_offset_x=$${idx++}`);vals.push(parseFloat(imagen_offset_x)); }
    if (imagen_offset_y !== undefined){ sets.push(`imagen_offset_y=$${idx++}`);vals.push(parseFloat(imagen_offset_y)); }
    if (stock !== undefined)          { sets.push(`stock=$${idx++}`);           vals.push(Math.max(0, parseInt(stock, 10))); }
    if (activo !== undefined)         { sets.push(`activo=$${idx++}`);          vals.push(activo); }
    if (req.user.rol === 'admin' && es_admin !== undefined) {
      sets.push(`es_admin=$${idx++}`); vals.push(es_admin);
    }
    sets.push('fecha_actualizacion=NOW()');

    if (sets.length === 1) return responses.badRequest(res, 'Nada que actualizar');

    vals.push(id);
    await pool.query(`UPDATE mercancia SET ${sets.join(',')} WHERE id_mercancia=$${idx}`, vals);
    return res.json({ message: 'Producto actualizado exitosamente' });
  } catch (err) {
    console.error('Error actualizando producto:', err);
    return responses.error(res, 'Error actualizando producto');
  }
});

// DELETE /api/mercancia/:id
router.delete('/:id', requireEliteOrAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const check = await pool.query(
      'SELECT id_usuario FROM mercancia WHERE id_mercancia = $1', [id]
    );
    if (!check.rowCount) return responses.notFound(res, 'Producto');
    if (check.rows[0].id_usuario !== req.user.id_usuario && req.user.rol !== 'admin') {
      return responses.forbidden(res, 'Sin permiso para eliminar este producto');
    }
    await pool.query('DELETE FROM mercancia WHERE id_mercancia = $1', [id]);
    return res.json({ message: 'Producto eliminado exitosamente' });
  } catch (err) {
    console.error('Error eliminando producto:', err);
    return responses.error(res, 'Error eliminando producto');
  }
});

module.exports = router;
