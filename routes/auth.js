// routes/auth.js
const express = require("express");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const nodemailer = require("nodemailer");
const router = express.Router();
const pool = require("../utils/database");
const responses = require("../utils/responses");
const queries = require("../utils/queries");

const resetCodes = new Map();
const googleLoginCodes = new Map();
const CODE_TTL_MS = 10 * 60 * 1000;

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ""));
}

function isStrongPassword(password) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,72}$/.test(String(password || ""));
}

function cleanUsername(username) {
  return String(username || "").trim();
}

function createCode() {
  return String(crypto.randomInt(100000, 1000000));
}

function hashCode(code) {
  return crypto.createHash("sha256").update(String(code)).digest("hex");
}

function createTempCode(store, data) {
  const code = crypto.randomBytes(24).toString("hex");
  store.set(code, { ...data, expiresAt: Date.now() + CODE_TTL_MS });
  return code;
}

function consumeTempCode(store, code) {
  const entry = store.get(code);
  store.delete(code);
  if (!entry || entry.expiresAt < Date.now()) return null;
  return entry;
}

function buildSafeGoogleUsername(profile) {
  const base = String(profile.displayName || profile.emails?.[0]?.value?.split("@")[0] || "google_user")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_.-]/g, "_")
    .slice(0, 20) || "google_user";
  return `${base}_${crypto.randomInt(1000, 9999)}`;
}

function getTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return null;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendResetCodeEmail(correo, code) {
  const transporter = getTransporter();
  if (!transporter) return false;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: correo,
    subject: "Codigo para restablecer tu contrasena - AttoMusic",
    text: `Tu codigo para restablecer tu contrasena es: ${code}. Expira en 10 minutos.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#222;">
        <h2 style="color:#5a189a;">AttoMusic</h2>
        <p>Usa este codigo para confirmar el cambio de contrasena:</p>
        <p style="font-size:28px;font-weight:800;letter-spacing:6px;color:#ba01ff;">${code}</p>
        <p>Expira en 10 minutos. Si no lo solicitaste, ignora este correo.</p>
      </div>
    `,
  });

  return true;
}

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || "/auth/google/callback",
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const correo = profile.emails?.[0]?.value?.toLowerCase();
      if (!correo) return done(null, false, { message: "Google no devolvio un correo" });

      let result = await pool.query(queries.getUserByEmail, [correo]);
      let user = result.rows[0];

      if (!user) {
        const usuario = buildSafeGoogleUsername(profile);
        const randomPassword = await bcrypt.hash(crypto.randomBytes(24).toString("hex"), 10);
        await pool.query(
          `INSERT INTO usuario (usuario, correo, contrasena, fecha_reg, rol, estado, foto)
           VALUES ($1, $2, $3, CURRENT_DATE, 'usuario', 'activo', $4)`,
          [usuario, correo, randomPassword, profile.photos?.[0]?.value || null]
        );
        result = await pool.query(queries.getUserByEmail, [correo]);
        user = result.rows[0];
      }

      return done(null, {
        id_usuario: user.id_usuario,
        usuario: user.usuario,
        correo: user.correo,
        rol: user.rol,
      });
    } catch (err) {
      return done(err);
    }
  }));
}

router.get("/auth/google", (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return responses.error(res, "Google Login no esta configurado", 503);
  }

  return passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })(req, res, next);
});

router.get("/auth/google/callback", (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.redirect("/?auth_error=google_not_configured");
  }

  passport.authenticate("google", { session: false }, (err, user) => {
    if (err || !user) {
      console.error("Error en Google OAuth:", err);
      return res.redirect("/?auth_error=google");
    }

    const code = createTempCode(googleLoginCodes, { user });
    return res.redirect(`/?google_login=${code}`);
  })(req, res, next);
});

router.get("/auth/google/session/:code", (req, res) => {
  const entry = consumeTempCode(googleLoginCodes, req.params.code);
  if (!entry) {
    return responses.unauthorized(res, "Sesion de Google expirada");
  }

  return res.json({
    message: "Inicio de sesion con Google exitoso",
    user: entry.user,
  });
});

// RUTA: Registro de usuario
router.post("/register", async (req, res) => {
  const usuario = cleanUsername(req.body.usuario);
  const correo = String(req.body.correo || "").trim().toLowerCase();
  const { contrasena } = req.body;

  if (!usuario || !correo || !contrasena) {
    return responses.badRequest(res, "Faltan campos obligatorios");
  }

  if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(usuario)) {
    return responses.badRequest(res, "El usuario debe tener 3 a 30 caracteres validos");
  }

  if (!isValidEmail(correo)) {
    return responses.badRequest(res, "Correo invalido");
  }

  if (!isStrongPassword(contrasena)) {
    return responses.badRequest(res, "La contrasena debe tener minimo 8 caracteres, mayuscula, minuscula, numero y simbolo");
  }

  try {
    const existe = await pool.query(queries.checkUserExists, [usuario, correo]);

    if (existe.rows.length > 0) {
      return responses.badRequest(res, "Usuario o correo ya registrado");
    }

    const hashedPassword = await bcrypt.hash(contrasena, 10);

    await pool.query(
      `INSERT INTO usuario (usuario, correo, contrasena, fecha_reg, rol, estado)
      VALUES ($1, $2, $3, CURRENT_DATE, 'usuario', 'activo')`,
      [usuario, correo, hashedPassword]
    );

    return res.json({ message: "Usuario registrado correctamente" });
  } catch (err) {
    console.error("Error en registro:", err);
    return responses.error(res, "Error en el registro de usuario");
  }
});

// RUTA: Inicio de sesión
router.post("/login", async (req, res) => {
  const usuario = cleanUsername(req.body.usuario);
  const { contrasena } = req.body;

  if (!usuario || !contrasena) {
    return responses.badRequest(res, "Faltan usuario o contraseña");
  }

  try {
    const result = await pool.query("SELECT * FROM usuario WHERE usuario = $1", [usuario]);
    
    if (result.rows.length === 0) {
      return responses.unauthorized(res, "Usuario no encontrado");
    }

    const user = result.rows[0];

    const match = await bcrypt.compare(contrasena, user.contrasena);
    if (!match) {
      return responses.unauthorized(res, "Contraseña incorrecta");
    }

    return res.json({
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
    return responses.error(res, "Error en inicio de sesión");
  }
});

// RUTA: Restablecer contraseña
router.post("/reset-password/request", async (req, res) => {
  const nombre = cleanUsername(req.body.nombre);
  const correo = String(req.body.correo || "").trim().toLowerCase();
  const { nuevaContrasena } = req.body;

  if (!nombre || !correo || !nuevaContrasena) {
    return responses.badRequest(res, "Faltan datos obligatorios");
  }

  if (!isValidEmail(correo)) {
    return responses.badRequest(res, "Correo invalido");
  }

  if (!isStrongPassword(nuevaContrasena)) {
    return responses.badRequest(res, "La contrasena debe tener minimo 8 caracteres, mayuscula, minuscula, numero y simbolo");
  }

  if (false && nuevaContrasena.length < 6) {
    return responses.badRequest(res, "La contraseña debe tener al menos 6 caracteres");
  }

  try {
    const userResult = await pool.query(
      "SELECT id_usuario FROM usuario WHERE usuario = $1 AND correo = $2",
      [nombre, correo]
    );

    if (userResult.rowCount === 0) {
      return responses.notFound(res, "Usuario o correo incorrectos");
    }

    const hashedPassword = await bcrypt.hash(nuevaContrasena, 10);
    const code = createCode();

    resetCodes.set(correo, {
      nombre,
      passwordHash: hashedPassword,
      codeHash: hashCode(code),
      expiresAt: Date.now() + CODE_TTL_MS,
      attempts: 0,
    });

    const emailSent = await sendResetCodeEmail(correo, code);

    return res.json({
      message: emailSent
        ? "Te enviamos un codigo de confirmacion a tu correo"
        : "Codigo generado. Configura SMTP para enviarlo por correo.",
      ...(emailSent ? {} : { devCode: code }),
    });
  } catch (err) {
    console.error("Error en reset-password:", err);
    return responses.error(res, "Error al actualizar la contraseña");
  }
});

router.post("/reset-password/confirm", async (req, res) => {
  const correo = String(req.body.correo || "").trim().toLowerCase();
  const codigo = String(req.body.codigo || "").trim();

  if (!isValidEmail(correo) || !/^\d{6}$/.test(codigo)) {
    return responses.badRequest(res, "Codigo o correo invalido");
  }

  const pending = resetCodes.get(correo);
  if (!pending || pending.expiresAt < Date.now()) {
    resetCodes.delete(correo);
    return responses.badRequest(res, "El codigo expiro o no existe");
  }

  pending.attempts += 1;
  if (pending.attempts > 5) {
    resetCodes.delete(correo);
    return responses.badRequest(res, "Demasiados intentos. Solicita un nuevo codigo");
  }

  if (pending.codeHash !== hashCode(codigo)) {
    return responses.badRequest(res, "Codigo incorrecto");
  }

  try {
    await pool.query(
      "UPDATE usuario SET contrasena = $1 WHERE correo = $2",
      [pending.passwordHash, correo]
    );

    resetCodes.delete(correo);
    return res.json({ message: "Contrasena actualizada correctamente" });
  } catch (err) {
    console.error("Error confirmando reset-password:", err);
    return responses.error(res, "Error al actualizar la contrasena");
  }
});

module.exports = router;
