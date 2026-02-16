const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { pool } = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { extractText } = require('../services/textExtractor');

const router = express.Router();

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const res_ = await pool.query(
      `SELECT id, original_name, mime_type, file_size, created_at
       FROM documents WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ documents: res_.rows });
  } catch (err) {
    res.status(500).json({ error: 'Eroare la listare' });
  }
});

router.get('/:id/file', async (req, res) => {
  try {
    const res_ = await pool.query(
      'SELECT filename, original_name, mime_type FROM documents WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    const doc = res_.rows[0];
    if (!doc) {
      return res.status(404).json({ error: 'Document negăsit' });
    }

    const filePath = path.join('uploads', req.user.id, doc.filename);
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ error: 'Fișier negăsit pe disc' });
    }

    res.setHeader('Content-Type', doc.mime_type);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.original_name)}"`);
    res.sendFile(path.resolve(filePath));
  } catch (err) {
    res.status(500).json({ error: 'Eroare la descărcare' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const res_ = await pool.query(
      `SELECT id, original_name, mime_type, extracted_text, file_size, created_at
       FROM documents WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    const doc = res_.rows[0];
    if (!doc) {
      return res.status(404).json({ error: 'Document negăsit' });
    }
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: 'Eroare la citire' });
  }
});

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Niciun fișier încărcat' });
    }

    const filePath = path.join(req.file.destination, req.file.filename);
    let extractedText = '';

    try {
      extractedText = await extractText(filePath, req.file.mimetype);
    } catch (extractErr) {
      console.error('Extract error:', extractErr);
    }

    const res_ = await pool.query(
      `INSERT INTO documents (user_id, filename, original_name, mime_type, extracted_text, file_size)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, original_name, mime_type, file_size, created_at`,
      [
        req.user.id,
        req.file.filename,
        req.file.originalname,
        req.file.mimetype,
        extractedText,
        req.file.size,
      ]
    );

    res.status(201).json(res_.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Eroare la încărcare' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const res_ = await pool.query(
      'SELECT filename FROM documents WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    const doc = res_.rows[0];
    if (!doc) {
      return res.status(404).json({ error: 'Document negăsit' });
    }

    const filePath = path.join('uploads', req.user.id, doc.filename);
    try {
      await fs.unlink(filePath);
    } catch (e) {
      // ignore if file already gone
    }

    await pool.query('DELETE FROM documents WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Eroare la ștergere' });
  }
});

module.exports = router;
