require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

require('./config/passport');

const authRoutes = require('./routes/auth');
const oauthRoutes = require('./routes/oauth');
const documentsRoutes = require('./routes/documents');
const ttsRoutes = require('./routes/tts');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || process.env.CALLBACK_BASE_URL?.includes(new URL(origin).hostname) || origin.includes('89.46.7.215')) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/auth', oauthRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/tts', ttsRoutes);

app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'Fișier prea mare (max 20MB)' });
  }
  res.status(500).json({ error: err.message || 'Eroare server' });
});

app.listen(PORT, () => {
  console.log(`Server pornit pe http://localhost:${PORT}`);
});
