/**
 * Shared API helpers for FluentVoice frontend.
 */
const FluentVoiceAPI = {
    /**
     * Upload audio for pronunciation analysis.
     *
     * @param {Blob}   audioBlob      - WAV audio blob
     * @param {string} referenceText  - The sentence the user was supposed to read
     * @param {string} [filename]     - Optional filename (default: 'recording.wav')
     * @returns {Promise<Object>}     - { transcription, phonemes, feedback, aiFeedback }
     */
    async analyzeSpeech(audioBlob, referenceText, filename = 'recording.wav') {
        const formData = new FormData();
        formData.append('audio', audioBlob, filename);
        if (referenceText) {
            formData.append('referenceText', referenceText);
        }

        const response = await fetch('/api/analyze-speech', {
            method: 'POST',
            body: formData
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.detail || data.error || 'Speech analysis failed');
        }

        return data;
    }
};
