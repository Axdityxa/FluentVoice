/**
 * Shared phoneme-to-letter mapping and colored transcription rendering.
 *
 * Used by: proficiency.html, practice.html, analyze.html
 */

/* ── phoneme → letter lookup table ───────────────────────────── */
const PHONEME_MAP = {
    // Vowels
    'iy': 'i|y|ee|ea|e',
    'ih': 'i|y|e',
    'eh': 'e|ea|a',
    'ae': 'a|ai',
    'ah': 'u|o|a',
    'uw': 'oo|u|o',
    'uh': 'oo|u|o',
    'ao': 'o|au|aw|a',
    'aa': 'a|o',
    'ey': 'a|ay|ai|ei',
    'ay': 'i|y|ie',
    'oy': 'oi|oy',
    'ow': 'o|ow',
    'aw': 'ow|ou|au',
    'ax': 'a|e|i|o|u',
    // Consonants
    'p': 'p',
    'b': 'b',
    't': 't',
    'd': 'd',
    'k': 'k|c|ck|ch',
    'g': 'g',
    'ch': 'ch|tch',
    'jh': 'j|g|dge',
    'f': 'f|ph|gh',
    'v': 'v',
    'th': 'th',
    'dh': 'th',
    's': 's|c|ce|ss',
    'z': 'z|s|ss',
    'sh': 'sh|ti|ci',
    'zh': 's|si',
    'hh': 'h',
    'm': 'm|mm',
    'n': 'n|nn|kn',
    'ng': 'ng',
    'l': 'l|ll',
    'r': 'r|rr|wr',
    'y': 'y|i',
    'w': 'w|wh',
    'dx': 't|tt|dd',
    'er': 'er|ir|ur|or|ar'
};

/**
 * Map each letter in the transcription to its closest phoneme using a 3-pass
 * strategy: exact match → phonemeMap lookup → fuzzy match.
 *
 * @param {string}   transcription  - Recognised text (e.g. "hello world")
 * @param {Object[]} phonemes       - Array of {phoneme, accuracyScore, fromWord, …}
 * @returns {Map<number, Object>}     position → phoneme object
 */
function mapLettersToPhonemes(transcription, phonemes) {
    const letterToPhoneme = new Map();
    let currentPosition = 0;

    const normalizedPhonemes = phonemes.map(p => ({
        ...p,
        phoneme: p.phoneme.toLowerCase(),
        fromWord: p.fromWord.toLowerCase()
    }));

    transcription.split(' ').forEach(word => {
        const wordLower = word.toLowerCase();
        const wordPhonemes = normalizedPhonemes.filter(p => p.fromWord === wordLower);

        word.split('').forEach(letter => {
            const letterLower = letter.toLowerCase();
            let matchFound = false;

            // Pass 1: exact phoneme match
            for (const phoneme of wordPhonemes) {
                if (phoneme.phoneme === letterLower) {
                    letterToPhoneme.set(currentPosition, phoneme);
                    matchFound = true;
                    break;
                }
            }

            // Pass 2: phoneme map lookup
            if (!matchFound) {
                for (const phoneme of wordPhonemes) {
                    for (const [phone, letters] of Object.entries(PHONEME_MAP)) {
                        if (phoneme.phoneme.includes(phone) && letters.split('|').includes(letterLower)) {
                            letterToPhoneme.set(currentPosition, phoneme);
                            matchFound = true;
                            break;
                        }
                    }
                    if (matchFound) break;
                }
            }

            // Pass 3: fuzzy match
            if (!matchFound) {
                const bestMatch = wordPhonemes.find(p =>
                    p.phoneme.includes(letterLower) ||
                    letterLower.includes(p.phoneme) ||
                    Object.entries(PHONEME_MAP).some(([phone, letters]) =>
                        p.phoneme.includes(phone) && letters.includes(letterLower)
                    )
                );
                if (bestMatch) {
                    letterToPhoneme.set(currentPosition, bestMatch);
                } else if (wordPhonemes.length > 0) {
                    letterToPhoneme.set(currentPosition, wordPhonemes[0]);
                }
            }

            currentPosition++;
        });
        currentPosition++; // space between words
    });

    return letterToPhoneme;
}

/**
 * Build an HTML string with each letter coloured by its phoneme accuracy.
 *
 * @param {string}              transcription
 * @param {Map<number, Object>} letterToPhoneme - from mapLettersToPhonemes()
 * @returns {string} HTML
 */
function renderColoredTranscription(transcription, letterToPhoneme) {
    let html = '<div style="font-size: 1.5em; line-height: 1.5; letter-spacing: 1px;">';
    let position = 0;

    transcription.split('').forEach(letter => {
        const phoneme = letterToPhoneme.get(position);
        const color = (phoneme && phoneme.accuracyScore < 90)
            ? getScoreColor(phoneme.accuracyScore)
            : '#27ae60';

        if (letter === ' ') {
            html += ' ';
        } else {
            html += `<span style="color: ${color}; font-weight: bold;">${letter}</span>`;
        }
        position++;
    });

    html += '</div>';
    return html;
}

/**
 * Render word-grouped phoneme analysis cards.
 *
 * @param {Object[]} phonemes        - Array of {phoneme, accuracyScore, fromWord}
 * @param {Object}   [opts]
 * @param {string[]} [opts.problemPhonemes] - Highlight these phonemes with a 🎯
 * @returns {string} HTML
 */
function renderPhonemeCards(phonemes, opts = {}) {
    const problemPhonemes = opts.problemPhonemes || [];

    if (!phonemes || phonemes.length === 0) {
        return `
            <div style="text-align: center; padding: 2rem;">
                <p style="color: #e74c3c; font-size: 1.1em;">No phoneme analysis available.</p>
                <p>Please try speaking more clearly or check your microphone.</p>
            </div>`;
    }

    // Group by word
    const byWord = {};
    phonemes.forEach(p => {
        if (!byWord[p.fromWord]) byWord[p.fromWord] = [];
        byWord[p.fromWord].push({ ...p, isProblem: problemPhonemes.includes(p.phoneme) });
    });

    let html = '<div style="display: flex; flex-direction: column; gap: 1.5rem; padding: 1rem;">';

    Object.entries(byWord).forEach(([word, phs]) => {
        html += `
            <div style="background: white; border-radius: 8px; padding: 1rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h4 style="margin: 0 0 0.8rem 0; color: #333; font-size: 1.2em; border-bottom: 1px solid #eee; padding-bottom: 0.5rem;">
                    "${word}"
                </h4>
                <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: flex-start;">`;

        phs.forEach(ph => {
            const score = ph.accuracyScore || 0;
            const color = getScoreColor(score);
            const isProblem = ph.isProblem;
            html += `
                <div style="
                    display: inline-flex; flex-direction: column; align-items: center;
                    background: ${isProblem ? '#fff3e0' : '#f8f9fa'};
                    border: ${isProblem ? '2px solid #ff9800' : '1px solid #ddd'};
                    border-radius: 8px; padding: 0.6rem; min-width: 60px;">
                    <span style="font-size: 1.1em; font-weight: bold; color: #333; margin-bottom: 0.2rem;">
                        ${ph.phoneme}${isProblem ? ' 🎯' : ''}
                    </span>
                    <span style="color: ${color}; font-weight: bold; font-size: 1em;">${score}%</span>
                    ${isProblem ? '<div style="font-size: 0.8em; color: #666; margin-top: 0.3rem; text-align: center;">Focus sound</div>' : ''}
                </div>`;
        });

        html += '</div></div>';
    });

    html += '</div>';
    return html;
}
