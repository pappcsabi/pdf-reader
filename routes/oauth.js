const express = require('express');
const passport = require('passport');
const authService = require('../services/authService');

const router = express.Router();
const BASE = process.env.CALLBACK_BASE_URL || 'http://localhost:3000';

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false }),
  (req, res) => {
    const user = req.user;
    const token = authService.generateToken(user);
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.redirect(`${BASE}/?login=ok`);
  }
);

router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

router.get(
  '/github/callback',
  passport.authenticate('github', { session: false }),
  (req, res) => {
    const user = req.user;
    const token = authService.generateToken(user);
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.redirect(`${BASE}/?login=ok`);
  }
);

module.exports = router;
