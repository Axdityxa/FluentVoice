import express from 'express';
import cors from 'cors';
import multer from 'multer';
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const ENV_PATH = path.join(ROOT_DIR, '.env');

dotenv.config({ path: ENV_PATH });

if (!process.env.SPEECH_KEY || !process.env.SPEECH_REGION) {
    console.error('Missing required environment variables: SPEECH_KEY and/or SPEECH_REGION');
    console.error(`Create a .env file at: ${ENV_PATH}`);
    process.exit(1);
}

if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const app = express();
const upload = multer({ dest: UPLOADS_DIR });

const openai = process.env.OPENAI_API_KEY
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.use(express.static(PUBLIC_DIR, {
    index: 'index.html',
    dotfiles: 'deny'
}));

let currentReferenceText = 'Please generate a tongue twister first';

app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        speechConfigured: Boolean(process.env.SPEECH_KEY && process.env.SPEECH_REGION),
        openaiConfigured: Boolean(openai)
    });
});

app.post('/api/set-reference', (req, res) => {
    if (req.body?.referenceText) {
        currentReferenceText = req.body.referenceText;
        res.json({ success: true, message: 'Reference text updated' });
        return;
    }
    res.status(400).json({ error: 'No reference text provided' });
});

app.post('/api/analyze-speech', upload.single('audio'), async (req, res) => {
    let uploadedFilePath = null;

    try {
        if (!req.file) {
            res.status(400).json({ error: 'No audio file received' });
            return;
        }

        uploadedFilePath = req.file.path;

        const speechConfig = sdk.SpeechConfig.fromSubscription(
            process.env.SPEECH_KEY,
            process.env.SPEECH_REGION
        );
        speechConfig.speechRecognitionLanguage = 'en-US';

        const pronunciationConfig = new sdk.PronunciationAssessmentConfig(
            currentReferenceText,
            sdk.PronunciationAssessmentGradingSystem.HundredMark,
            sdk.PronunciationAssessmentGranularity.Phoneme,
            true
        );

        const audioConfig = sdk.AudioConfig.fromWavFileInput(
            fs.readFileSync(uploadedFilePath)
        );

        speechConfig.setProperty(
            sdk.PropertyId.SpeechServiceResponse_PostProcessingOption,
            'detailed'
        );

        const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
        pronunciationConfig.applyTo(recognizer);

        const result = await new Promise((resolve, reject) => {
            const assessmentResults = [];

            recognizer.recognized = (s, e) => {
                if (!e.result.text) return;

                const properties = JSON.parse(
                    e.result.properties.getProperty(sdk.PropertyId.SpeechServiceResponse_JsonResult)
                );

                const allPhonemes = [];
                if (properties.NBest?.[0]?.Words) {
                    properties.NBest[0].Words.forEach((word) => {
                        word.Phonemes?.forEach((phoneme) => {
                            allPhonemes.push({
                                phoneme: phoneme.Phoneme,
                                accuracyScore: Math.round(
                                    phoneme.PronunciationAssessment?.AccuracyScore || 0
                                ),
                                fromWord: word.Word,
                                duration: phoneme.Duration,
                                offset: phoneme.Offset
                            });
                        });
                    });
                }

                assessmentResults.push({
                    text: e.result.text,
                    phonemes: allPhonemes
                });
            };

            recognizer.recognizeOnceAsync(
                (speechResult) => resolve({ result: speechResult, assessmentResults }),
                (error) => reject(error)
            );
        });

        const finalResponse = {
            transcription: result.result.text,
            phonemes: result.assessmentResults[0]?.phonemes || [],
            feedback: 'Speech analysis completed'
        };

        const lowScoringPhonemes = finalResponse.phonemes
            .filter((p) => p.accuracyScore < 70)
            .map((p) => ({
                phoneme: p.phoneme,
                score: p.accuracyScore,
                word: p.fromWord
            }));

        if (lowScoringPhonemes.length === 0) {
            finalResponse.aiFeedback = 'Great job! All phonemes were pronounced well.';
        } else if (!openai) {
            finalResponse.aiFeedback =
                'AI feedback is unavailable. Add OPENAI_API_KEY to your .env file.';
        } else {
            try {
                const aiResponse = await openai.chat.completions.create({
                    model: 'gpt-3.5-turbo',
                    messages: [
                        {
                            role: 'system',
                            content:
                                'You are a helpful speech therapist providing specific, actionable pronunciation advice.'
                        },
                        {
                            role: 'user',
                            content: `As a speech therapist, provide specific advice for improving these phonemes:
${JSON.stringify(lowScoringPhonemes, null, 2)}

For each problematic phoneme:
1. Explain mouth, tongue, and lip position
2. Provide a simple practice exercise
3. Suggest 2-3 practice words

Format the response in clear HTML bullet points.`
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 500
                });

                finalResponse.aiFeedback = aiResponse.choices[0].message.content;
            } catch (error) {
                console.error('OpenAI API error:', error.message);
                finalResponse.aiFeedback =
                    'AI feedback unavailable at the moment. Error: ' + error.message;
            }
        }

        res.json(finalResponse);
    } catch (error) {
        console.error('Analysis error:', error);
        res.status(500).json({ error: error.message || 'Speech analysis failed' });
    } finally {
        if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
            fs.unlinkSync(uploadedFilePath);
        }
    }
});

const PORT = Number(process.env.PORT) || 3000;
const server = app.listen(PORT, () => {
    console.log(`FluentVOice server running at http://localhost:${PORT}`);
    console.log(`Serving frontend from: ${PUBLIC_DIR}`);
    console.log(`OpenAI: ${openai ? 'enabled' : 'disabled (optional)'}`);
});

server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`\nPort ${PORT} is already in use.`);
        console.error('Stop the other process, or set a different PORT in .env (e.g. PORT=3001).');
        console.error(`Windows: netstat -ano | findstr :${PORT}  then  taskkill /PID <pid> /F\n`);
    } else {
        console.error('Server failed to start:', error.message);
    }
    process.exit(1);
});
