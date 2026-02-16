const express = require('express');
const authService = require('../services/authService');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password || password.length < 6) {
      return res.status(400).json({
        error: 'Email și parolă necesare (minim 6 caractere)',
      });
    }

    const existing = await authService.findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'Email deja folosit' });
    }

    const user = await authService.createUser(email, password);
    const token = authService.generateToken(user);

    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    res.cookie('token', token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
    res.json({ user: { id: user.id, email: user.email }, token });
  } catch (err) {
    res.status(500).json({ error: 'Eroare la înregistrare' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email și parolă necesare' });
    }

    const user = await authService.findUserByEmail(email);
    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'Email sau parolă incorectă' });
    }

    const ok = await authService.comparePassword(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Email sau parolă incorectă' });
    }

    const token = authService.generateToken(user);
    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    res.cookie('token', token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
    res.json({ user: { id: user.id, email: user.email }, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Eroare la autentificare' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: { id: req.user.id, email: req.user.email } });
});

module.exports = router;
