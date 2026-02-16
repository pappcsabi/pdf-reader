const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const SALT_ROUNDS = 10;

async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

async function findUserByEmail(email) {
  const res = await pool.query(
    'SELECT id, email, password_hash, google_id, github_id FROM users WHERE email = $1',
    [email.toLowerCase()]
  );
  return res.rows[0];
}

async function findUserById(id) {
  const res = await pool.query(
    'SELECT id, email, google_id, github_id, created_at FROM users WHERE id = $1',
    [id]
  );
  return res.rows[0];
}

async function findOrCreateUserByOAuth(provider, profile) {
  const idField = provider === 'google' ? 'google_id' : 'github_id';
  const idValue = String(profile.id);

  const existingByOAuth = await pool.query(
    `SELECT id, email FROM users WHERE ${idField} = $1`,
    [idValue]
  );

  if (existingByOAuth.rows[0]) {
    return existingByOAuth.rows[0];
  }

  const email = (profile.emails?.[0]?.value || profile._json?.email || `${profile.id}@${provider}.local`).toLowerCase();

  const existingByEmail = await pool.query(
    'SELECT id, email FROM users WHERE email = $1',
    [email]
  );

  if (existingByEmail.rows[0]) {
    await pool.query(
      `UPDATE users SET ${idField} = $1 WHERE id = $2`,
      [idValue, existingByEmail.rows[0].id]
    );
    return existingByEmail.rows[0];
  }

  const insertRes = await pool.query(
    `INSERT INTO users (email, ${idField}) VALUES ($1, $2) RETURNING id, email`,
    [email, idValue]
  );
  return insertRes.rows[0];
}

async function createUser(email, password) {
  const hash = await hashPassword(password);
  const res = await pool.query(
    `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email`,
    [email.toLowerCase(), hash]
  );
  return res.rows[0];
}

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  findUserByEmail,
  findUserById,
  findOrCreateUserByOAuth,
  createUser,
};
