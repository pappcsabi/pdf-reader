const jwt = require('jsonwebtoken');
const authService = require('../services/authService');

async function authMiddleware(req, res, next) {
  let token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) {
    token = req.cookies?.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Autentificare necesară' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await authService.findUserById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'Utilizator invalid' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token invalid sau expirat' });
  }
}

module.exports = { authMiddleware };
