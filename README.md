# FluentVoice

AI-powered speech therapy web app for English pronunciation practice. Record your voice, get phoneme-level scores from Azure Speech, and optional personalized tips from Google Gemini.

## Project structure

```
FluentVoice/
├── public/              # Frontend (HTML, CSS, JS)
│   ├── css/
│   ├── js/
│   │   ├── api.js              # Shared API helpers
│   │   ├── audio-utils.js      # Recording / WAV conversion
│   │   └── phoneme-mapper.js   # Phoneme scores → colored transcription
│   ├── index.html
│   ├── proficiency.html
│   ├── practice.html
│   └── analyze.html
├── app/                 # FastAPI backend
│   ├── main.py          # Application entry point
│   ├── config.py        # Pydantic settings
│   ├── routers/
│   │   └── speech.py    # API route handlers
│   └── services/
│       ├── azure_speech.py     # Azure pronunciation assessment
│       └── gemini_feedback.py  # AI feedback generation
├── .env.example
├── requirements.txt
└── README.md
```

## Requirements

- [Python](https://www.python.org/) 3.10+
- [Azure Speech Service](https://azure.microsoft.com/products/ai-services/speech-to-text) subscription
- [Google AI API key](https://aistudio.google.com/apikey) (optional, for AI pronunciation tips)

## Setup

1. Clone the repository.
2. Copy `.env.example` to `.env` in the project root.
3. Fill in your credentials in `.env`.
4. Create a virtual environment and install dependencies:

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
```

5. Start the development server:

```bash
uvicorn app.main:app --reload --port 3000
```

6. Open **http://localhost:3000** in your browser and allow microphone access.

## Environment variables

Create `.env` in the project root (see `.env.example`):

| Variable | Required | Description |
|----------|----------|-------------|
| `SPEECH_KEY` | Yes | Azure Speech subscription key |
| `SPEECH_REGION` | Yes | Azure region (e.g. `eastus`) |
| `GEMINI_API_KEY` | No | Enables AI pronunciation tips via Gemini |
| `PORT` | No | Server port (default: `3000`) |

## Scripts

| Command | Description |
|---------|-------------|
| `pip install -r requirements.txt` | Install Python dependencies |
| `uvicorn app.main:app --reload --port 3000` | Start dev server with auto-reload |
| `uvicorn app.main:app --port 3000` | Start production server |

## User flow

1. **Home** (`/`) — overview and Get Started
2. **Proficiency test** (`/proficiency.html`) — baseline assessment with phoneme-level scoring
3. **Practice** (`/practice.html`) — exercises focused on weak phonemes
4. **Analyze** (`/analyze.html`) — ad-hoc recording and tongue twisters

Reference text is sent with each recording in the same request (no server-side session state).

## API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Server status; `speechConfigured`, `geminiConfigured` |
| `POST` | `/api/analyze-speech` | Upload WAV + reference text; returns phoneme scores and optional AI feedback |

### `POST /api/analyze-speech`

Multipart form fields:

| Field | Type | Description |
|-------|------|-------------|
| `audio` | file | WAV recording |
| `referenceText` | string | Sentence the user was supposed to read |

Response (JSON):

| Field | Description |
|-------|-------------|
| `transcription` | Recognized text |
| `phonemes` | List of `{ phoneme, accuracyScore, fromWord, duration, offset }` |
| `feedback` | Status message |
| `aiFeedback` | HTML tips from Gemini (or a fallback if Gemini is not configured) |

Phonemes scoring below 70 trigger personalized AI feedback when `GEMINI_API_KEY` is set.
