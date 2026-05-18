/**
 * Shared API helpers for FluentVoice frontend.
 */
const FluentVoiceAPI = {
    async setReference(referenceText) {
        const response = await fetch('/api/set-reference', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ referenceText })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || 'Failed to set reference text');
        }

        return response.json();
    },

    async analyzeSpeech(audioBlob, filename = 'recording.wav') {
        const formData = new FormData();
        formData.append('audio', audioBlob, filename);

        const response = await fetch('/api/analyze-speech', {
            method: 'POST',
            body: formData
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.error || 'Speech analysis failed');
        }

        return data;
    }
};
