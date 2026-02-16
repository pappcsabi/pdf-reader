# PDF Reader - Cititor cu voce

Aplicație web full-stack pentru citirea documentelor (PDF, DOCX, TXT) cu text-to-speech. Permite încărcarea documentelor pe server, autentificare (email/parolă, Google OAuth, GitHub OAuth), și redare audio cu controale media pentru background playback.

## Caracteristici

- 📄 **Suport multiple formate**: PDF, DOCX, TXT
- 🎤 **Multiple motoare TTS**: Web Speech API (browser), Edge TTS (Microsoft), gTTS (Google)
- 🔊 **Redare continuă**: Media Session API pentru controale pe ecran blocat
- 📱 **Responsive**: Funcționează pe desktop și mobile
- 🔐 **Autentificare**: Email/parolă, Google OAuth, GitHub OAuth
- 📚 **Bibliotecă documente**: Stocare persistentă pe server
- 🎯 **Prompter**: Highlighting text sincronizat cu audio
- ⏯️ **Controale**: Play, Pause, Stop, Skip ±10s, navigare capitole

## Cerințe

- Node.js 18+
- PostgreSQL

## Setup

1. Copiază `.env.example` în `.env` și completează variabilele:

```bash
cp .env.example .env
```

2. Creează baza de date PostgreSQL:

```bash
createdb pdf_reader
```

3. Rulează migrațiile:

```bash
npm run migrate
```

4. Pentru OAuth (Google/GitHub), adaugă în `.env`:

- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
- `CALLBACK_BASE_URL` (ex: `http://localhost:3000`)

Configurează în Google Cloud Console și GitHub Developer Settings redirect URI-urile:
- `http://localhost:3000/api/auth/google/callback`
- `http://localhost:3000/api/auth/github/callback`

5. Pornește serverul:

```bash
npm start
```

Sau pentru dev cu auto-reload:

```bash
npm run dev
```

## Docker

```bash
# Build și pornire
docker compose up -d

# Loguri
docker compose logs -f app

# Oprire
docker compose down
```

Variabile din `.env` sunt citite automat. `uploads` și datele PostgreSQL sunt persistente în volume.

## Utilizare

1. Înregistrează-te sau conectează-te (email/parolă sau Google/GitHub)
2. Încarcă PDF, DOCX sau TXT (drag & drop sau buton)
3. Click pe un document pentru a-l selecta
4. Alege vocea și viteza, apoi Play
5. Back/Forward 10s pentru navigare
6. Media Session API permite controale pe ecran blocat (Android)
