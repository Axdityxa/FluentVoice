/**
 * Audio recording and WAV conversion utilities.
 */
function audioBufferToWav(buffer) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1;
    const bitDepth = 16;
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const wav = new ArrayBuffer(44 + buffer.length * bytesPerSample);
    const view = new DataView(wav);

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + buffer.length * bytesPerSample, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(view, 36, 'data');
    view.setUint32(40, buffer.length * bytesPerSample, true);

    const offset = 44;
    const data = new Float32Array(buffer.length);
    buffer.copyFromChannel(data, 0);

    for (let i = 0; i < data.length; i++) {
        const sample = Math.max(-1, Math.min(1, data[i]));
        view.setInt16(offset + i * bytesPerSample, sample * 0x7FFF, true);
    }

    return wav;
}

function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

function getScoreColor(score) {
    if (score >= 90) return '#27ae60';
    if (score >= 75) return '#2ecc71';
    if (score >= 60) return '#f1c40f';
    if (score >= 40) return '#e67e22';
    return '#e74c3c';
}

async function webmBlobToWavBlob(webmBlob) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const arrayBuffer = await webmBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const wavBuffer = audioBufferToWav(audioBuffer);
    return new Blob([wavBuffer], { type: 'audio/wav' });
}
