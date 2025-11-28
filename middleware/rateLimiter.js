// middleware/rateLimiter.js
const rateLimit = require("express-rate-limit");

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 60, // Máximo 60 peticiones por 1 minuto por IP
  message: { error: "Demasiadas peticiones, intenta más tarde." },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = limiter;