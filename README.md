# FluentVoice

AI-powered speech therapy web app for English pronunciation practice. Record your voice, get phoneme-level scores from Azure Speech, and optional personalized tips from OpenAI.

## Project structure

```
FluentVoice/
├── public/              # Frontend (HTML, CSS, JS)
│   ├── css/
│   ├── js/
│   ├── index.html
│   ├── proficiency.html
│   ├── practice.html
│   └── analyze.html
├── server/              # Express API
│   ├── server.js
│   └── uploads/         # Temporary audio (gitignored)
├── .env.example
└── package.json         # Root scripts (install + dev)
```

## Requirements

- [Node.js](https://nodejs.org/) 18+
- [Azure Speech Service](https://azure.microsoft.com/products/ai-services/speech-to-text) subscription
- [OpenAI API key](https://platform.openai.com/) (optional, for AI feedback)

## Setup

1. Clone the repository.
2. Copy `.env.example` to `.env` in the project root.
3. Fill in your credentials in `.env`.
4. Install dependencies and start the server:

```bash
npm install
npm run dev
```

5. Open **http://localhost:3000** in your browser and allow microphone access.

## Environment variables

Create `.env` in the project root:

| Variable | Required | Description |
|----------|----------|-------------|
| `SPEECH_KEY` | Yes | Azure Speech subscription key |
| `SPEECH_REGION` | Yes | Azure region (e.g. `eastus`) |
| `OPENAI_API_KEY` | No | Enables AI pronunciation tips |
| `PORT` | No | Server port (default: `3000`) |

## Scripts

| Command | Description |
|---------|-------------|
| `npm install` | Installs root + server dependencies |
| `npm run dev` | Starts server with nodemon |
| `npm start` | Starts server in production mode |

## User flow

1. **Home** (`/`) — overview and Get Started
2. **Proficiency test** (`/proficiency.html`) — baseline assessment
3. **Practice** (`/practice.html`) — exercises for weak phonemes
4. **Analyze** (`/analyze.html`) — ad-hoc recording and tongue twisters

## API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Server and config status |
| `POST` | `/api/set-reference` | Set reference text for pronunciation scoring |
| `POST` | `/api/analyze-speech` | Upload WAV audio for analysis |

## Security notes

- Never commit `.env` or API keys to GitHub.
- The server only serves files from `public/` (not the project root).
- Uploads are deleted after each analysis request.
