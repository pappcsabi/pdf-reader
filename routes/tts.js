const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const EDGE_VOICES = [
  { id: 'ro-RO-EmilNeural', name: 'Emil (ro, bărbat)' },
  { id: 'ro-RO-AlinaNeural', name: 'Alina (ro, femeie)' },
  { id: 'en-US-GuyNeural', name: 'Guy (en, bărbat)' },
  { id: 'en-US-JennyNeural', name: 'Jenny (en, femeie)' },
  { id: 'de-DE-ConradNeural', name: 'Conrad (de, bărbat)' },
  { id: 'de-DE-KatjaNeural', name: 'Katja (de, femeie)' },
];

router.get('/voices', authMiddleware, (req, res) => {
  const engine = req.query.engine || 'edge';
  if (engine === 'edge') {
    return res.json({ voices: EDGE_VOICES });
  }
  if (engine === 'gtts') {
    return res.json({ voices: [{ id: 'ro', name: 'Română (feminin)' }, { id: 'en', name: 'English (feminin)' }, { id: 'de', name: 'Deutsch' }] });
  }
  res.json({ voices: [] });
});

router.post('/generate', authMiddleware, (req, res) => {
  const { text, engine = 'edge', voice = 'ro-RO-EmilNeural' } = req.body;
  console.log('[TTS] Generate request:', { engine, voice, textLength: text?.length, user: req.user?.email });
  
  if (!text || typeof text !== 'string') {
    console.error('[TTS] Missing or invalid text');
    return res.status(400).json({ error: 'Text necesar' });
  }
  
  // Pentru documente mari, limităm la 50000 caractere pentru a evita timeout-uri
  const clean = text.slice(0, 50000);
  const script = engine === 'gtts' ? 'tts_gtts.py' : 'tts_edge.py';
  const scriptPath = path.join(__dirname, '..', 'scripts', script);
  const args = engine === 'gtts' ? [scriptPath, voice] : [scriptPath, voice];
  
  console.log('[TTS] Spawning:', { script, voice, textLength: clean.length });
  
  const proc = spawn('python3', args, {
    cwd: path.join(__dirname, '..'),
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  
  proc.stdin.write(clean, () => proc.stdin.end());
  res.setHeader('Content-Type', 'audio/mpeg');
  proc.stdout.pipe(res);
  
  proc.stderr.on('data', (d) => console.error('[TTS stderr]', d.toString()));
  proc.on('error', (err) => {
    console.error('[TTS] Spawn error:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Eroare TTS' });
  });
  proc.on('close', (code) => {
    console.log('[TTS] Process closed:', { code, headersSent: res.headersSent });
    if (code !== 0 && !res.headersSent) {
      res.status(500).json({ error: 'Eroare generare audio' });
    }
  });
});

module.exports = router;
