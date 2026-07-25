const rateLimit = require("express-rate-limit");

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => req.user?.uid || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many AI requests, please try again later" },
});

module.exports = { aiLimiter };
