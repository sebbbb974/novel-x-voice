/**
 * Module de synthèse vocale (Text-to-Speech)
 * Basé sur la Web Speech API du navigateur
 * Compatible Chrome, Edge, Safari
 */

class TextToSpeech {
    constructor() {
        this.synth = window.speechSynthesis;
        this.utterance = null;
        this.isPlaying = false;
        this.isPaused = false;
        this.currentText = '';
        this.voices = [];
        this.selectedVoice = null;

        // Pour le surlignement
        this.words = [];
        this.currentWordIndex = 0;
        this.highlightCallback = null;

        // Paramètres par défaut
        this.settings = {
            rate: 1.0,    // Vitesse (0.1 à 10)
            pitch: 1.0,   // Tonalité (0 à 2)
            volume: 1.0,  // Volume (0 à 1)
            lang: 'en-US'  // Anglais US par défaut
        };

        // Charger les préférences sauvegardées
        this.loadSettings();

        // Charger les voix disponibles
        this.loadVoices();

        // Écouter le chargement des voix (nécessaire pour Chrome)
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = () => this.loadVoices();
        }
    }

    /**
     * Charge les voix disponibles
     */
    loadVoices() {
        this.voices = this.synth.getVoices();

        // Trouver la meilleure voix selon la langue
        if (!this.selectedVoice || !this.voices.find(v => v.name === this.selectedVoice.name)) {
            if (this.settings.lang === 'en-US') {
                this.selectedVoice = this.findBestEnglishVoice();
            } else {
                this.selectedVoice = this.findBestFrenchVoice();
            }
        }

        return this.voices;
    }

    /**
     * Trouve la meilleure voix française disponible
     */
    findBestFrenchVoice() {
        // Ordre de préférence pour les voix françaises (voix de haute qualité en premier)
        const preferredVoices = [
            'Thomas (Premium)',  // macOS Premium
            'Amélie (Premium)',  // macOS Premium
            'Thomas (Enhanced)', // macOS Enhanced
            'Amelie (Enhanced)', // macOS Enhanced
            'Daniel (Enhanced)', // macOS Enhanced
            'Thomas',           // Edge/Windows
            'Google français',  // Chrome
            'Amelie',          // macOS
            'Daniel',          // macOS
            'Google French',   // Chrome anglais
            'Microsoft Paul',  // Windows
            'Microsoft Hortense', // Windows
            'Microsoft Julie'  // Windows
        ];

        // Chercher dans l'ordre de préférence
        for (const preferred of preferredVoices) {
            const voice = this.voices.find(v =>
                v.name.includes(preferred) && v.lang.startsWith('fr')
            );
            if (voice) {
                console.log('🎤 Voix sélectionnée:', voice.name);
                return voice;
            }
        }

        // Sinon, prendre n'importe quelle voix française
        const frenchVoice = this.voices.find(v => v.lang.startsWith('fr'));
        if (frenchVoice) {
            console.log('🎤 Voix sélectionnée (fallback):', frenchVoice.name);
            return frenchVoice;
        }

        // En dernier recours, prendre la première voix disponible
        console.log('⚠️ Aucune voix française trouvée, utilisation de la voix par défaut');
        return this.voices[0] || null;
    }

    /**
     * Trouve la meilleure voix anglaise américaine disponible
     */
    findBestEnglishVoice() {
        // Ordre de préférence pour les voix anglaises américaines (haute qualité en premier)
        const preferredVoices = [
            'Samantha (Premium)',    // macOS Premium
            'Alex (Premium)',        // macOS Premium
            'Samantha (Enhanced)',   // macOS Enhanced
            'Alex (Enhanced)',       // macOS Enhanced
            'Ava (Premium)',         // macOS Premium
            'Ava (Enhanced)',        // macOS Enhanced
            'Samantha',              // macOS
            'Google US English',     // Chrome
            'Microsoft David',       // Windows
            'Microsoft Zira',        // Windows
            'Microsoft Mark',        // Windows
            'Alex',                  // macOS
            'Google English'         // Chrome
        ];

        // Chercher dans l'ordre de préférence
        for (const preferred of preferredVoices) {
            const voice = this.voices.find(v =>
                v.name.includes(preferred) && v.lang.startsWith('en-US')
            );
            if (voice) {
                console.log('🎤 Voix anglaise sélectionnée:', voice.name);
                return voice;
            }
        }

        // Sinon, prendre n'importe quelle voix en-US
        const englishVoice = this.voices.find(v => v.lang.startsWith('en-US'));
        if (englishVoice) {
            console.log('🎤 Voix anglaise sélectionnée (fallback):', englishVoice.name);
            return englishVoice;
        }

        // Sinon, prendre n'importe quelle voix anglaise
        const anyEnglishVoice = this.voices.find(v => v.lang.startsWith('en'));
        if (anyEnglishVoice) {
            console.log('🎤 Voix anglaise sélectionnée (fallback 2):', anyEnglishVoice.name);
            return anyEnglishVoice;
        }

        // En dernier recours, prendre la première voix disponible
        console.log('⚠️ Aucune voix anglaise trouvée, utilisation de la voix par défaut');
        return this.voices[0] || null;
    }

    /**
     * Charge les paramètres depuis localStorage
     */
    loadSettings() {
        const saved = localStorage.getItem('tts-settings');
        if (saved) {
            try {
                const settings = JSON.parse(saved);
                this.settings = { ...this.settings, ...settings };
            } catch (e) {
                console.error('Erreur lors du chargement des paramètres TTS:', e);
            }
        }
    }

    /**
     * Sauvegarde les paramètres dans localStorage
     */
    saveSettings() {
        try {
            localStorage.setItem('tts-settings', JSON.stringify(this.settings));
            if (this.selectedVoice) {
                localStorage.setItem('tts-voice', this.selectedVoice.name);
            }
        } catch (e) {
            console.error('Erreur lors de la sauvegarde des paramètres TTS:', e);
        }
    }

    /**
     * Démarre la lecture du texte avec chunking pour textes longs
     */
    speak(text) {
        // Arrêter toute lecture en cours
        this.stop();

        if (!text || text.trim().length === 0) {
            console.warn('Aucun texte à lire');
            return;
        }

        this.currentText = text;
        this.currentWordIndex = 0;
        this.words = text.split(/(\s+)/);

        // Pour les textes longs (> 1000 caractères), diviser en chunks
        const chunks = this.splitTextIntoChunks(text, 1000);
        this.textChunks = chunks;
        this.currentChunkIndex = 0;

        this.speakNextChunk();
    }

    /**
     * Divise le texte en chunks pour éviter les timeouts
     */
    splitTextIntoChunks(text, maxLength) {
        if (text.length <= maxLength) {
            return [text];
        }

        const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
        const chunks = [];
        let currentChunk = '';

        for (const sentence of sentences) {
            if ((currentChunk + sentence).length <= maxLength) {
                currentChunk += sentence;
            } else {
                if (currentChunk) chunks.push(currentChunk.trim());
                currentChunk = sentence;
            }
        }

        if (currentChunk) chunks.push(currentChunk.trim());
        return chunks;
    }

    /**
     * Lit le chunk suivant
     */
    speakNextChunk() {
        if (this.currentChunkIndex >= this.textChunks.length) {
            this.isPlaying = false;
            this.isPaused = false;
            this.onEnd && this.onEnd();
            if (this.highlightCallback) {
                this.highlightCallback(-1, '');
            }
            return;
        }

        const chunk = this.textChunks[this.currentChunkIndex];
        this.utterance = new SpeechSynthesisUtterance(chunk);

        // Calculer l'offset du chunk dans le texte total
        let chunkOffset = 0;
        for (let i = 0; i < this.currentChunkIndex; i++) {
            chunkOffset += this.textChunks[i].length;
        }
        this.currentChunkOffset = chunkOffset;

        // Appliquer les paramètres
        this.utterance.voice = this.selectedVoice;
        this.utterance.rate = this.settings.rate;
        this.utterance.pitch = this.settings.pitch;
        this.utterance.volume = this.settings.volume;
        this.utterance.lang = this.settings.lang;

        // Événements
        this.utterance.onstart = () => {
            this.isPlaying = true;
            this.isPaused = false;
            if (this.currentChunkIndex === 0) {
                this.onStart && this.onStart();
            }
        };

        this.utterance.onend = () => {
            this.currentChunkIndex++;
            // Petite pause entre les chunks (100ms)
            setTimeout(() => {
                this.speakNextChunk();
            }, 100);
        };

        this.utterance.onerror = (event) => {
            console.error('Erreur TTS:', event);
            this.isPlaying = false;
            this.isPaused = false;
            this.onError && this.onError(event);
        };

        this.utterance.onpause = () => {
            this.isPaused = true;
            this.onPause && this.onPause();
        };

        this.utterance.onresume = () => {
            this.isPaused = false;
            this.onResume && this.onResume();
        };

        // SURLIGNEMENT DÉSACTIVÉ - causait des problèmes de scroll
        // this.utterance.onboundary = null;

        // Lancer la lecture
        this.synth.speak(this.utterance);
    }

    /**
     * Obtient le mot à l'index de caractère donné
     */
    getWordAtIndex(charIndex, text = null) {
        const sourceText = text || this.currentText;
        const textFromIndex = sourceText.substring(charIndex);
        const wordMatch = textFromIndex.match(/^\S+/);
        return wordMatch ? wordMatch[0] : '';
    }

    /**
     * Surlignement basé sur le temps (fallback si onboundary ne fonctionne pas)
     */
    startTimeBasedHighlight(text) {
        if (!this.highlightCallback) return;

        const words = text.split(/\s+/);
        const avgCharsPerWord = text.length / words.length;
        const timePerWord = (60 / (this.settings.rate * 200)) * 1000; // ~200 mots/min vitesse moyenne

        let currentIndex = 0;
        let wordIndex = 0;

        this.timeHighlightInterval = setInterval(() => {
            if (wordIndex >= words.length || !this.isPlaying || this.isPaused) {
                clearInterval(this.timeHighlightInterval);
                return;
            }

            const word = words[wordIndex];
            this.highlightCallback(currentIndex, word);
            currentIndex += word.length + 1; // +1 pour l'espace
            wordIndex++;
        }, timePerWord);
    }

    /**
     * Définit une fonction de callback pour le surlignement
     */
    setHighlightCallback(callback) {
        this.highlightCallback = callback;
    }

    /**
     * Met en pause la lecture
     */
    pause() {
        if (this.isPlaying && !this.isPaused) {
            this.synth.pause();
        }
    }

    /**
     * Reprend la lecture
     */
    resume() {
        if (this.isPlaying && this.isPaused) {
            this.synth.resume();
        }
    }

    /**
     * Arrête la lecture
     */
    stop() {
        this.synth.cancel();
        this.isPlaying = false;
        this.isPaused = false;

        // Nettoyer l'intervalle de surlignement si actif
        if (this.timeHighlightInterval) {
            clearInterval(this.timeHighlightInterval);
            this.timeHighlightInterval = null;
        }
    }

    /**
     * Change la vitesse de lecture
     */
    setRate(rate) {
        this.settings.rate = Math.max(0.1, Math.min(10, rate));
        this.saveSettings();

        // Si une lecture est en cours, la redémarrer avec les nouveaux paramètres
        if (this.isPlaying && this.currentText) {
            this.speak(this.currentText);
        }
    }

    /**
     * Change la tonalité
     */
    setPitch(pitch) {
        this.settings.pitch = Math.max(0, Math.min(2, pitch));
        this.saveSettings();

        if (this.isPlaying && this.currentText) {
            this.speak(this.currentText);
        }
    }

    /**
     * Change le volume
     */
    setVolume(volume) {
        this.settings.volume = Math.max(0, Math.min(1, volume));
        this.saveSettings();

        if (this.utterance) {
            this.utterance.volume = this.settings.volume;
        }
    }

    /**
     * Change la voix
     */
    setVoice(voiceName) {
        const voice = this.voices.find(v => v.name === voiceName);
        if (voice) {
            this.selectedVoice = voice;
            this.saveSettings();

            if (this.isPlaying && this.currentText) {
                this.speak(this.currentText);
            }
        }
    }

    /**
     * Obtient les voix françaises disponibles
     */
    getFrenchVoices() {
        return this.voices.filter(v => v.lang.startsWith('fr'));
    }

    /**
     * Obtient les voix anglaises américaines disponibles
     */
    getEnglishVoices() {
        return this.voices.filter(v => v.lang.startsWith('en-US') || v.lang.startsWith('en'));
    }

    /**
     * Obtient les voix selon la langue
     */
    getVoicesByLanguage(lang) {
        if (lang === 'fr-FR') {
            return this.getFrenchVoices();
        } else if (lang === 'en-US') {
            return this.getEnglishVoices();
        }
        return this.voices;
    }

    /**
     * Change la langue
     */
    setLanguage(lang) {
        this.settings.lang = lang;

        // Recharger les voix au cas où elles ne seraient pas encore chargées
        this.loadVoices();

        // Sélectionner automatiquement la meilleure voix pour cette langue
        if (lang === 'fr-FR') {
            this.selectedVoice = this.findBestFrenchVoice();
        } else if (lang === 'en-US') {
            this.selectedVoice = this.findBestEnglishVoice();
        }

        this.saveSettings();

        // Si une lecture est en cours, la redémarrer avec la nouvelle langue
        if (this.isPlaying && this.currentText) {
            const wasPlaying = !this.isPaused;
            this.speak(this.currentText);
            if (!wasPlaying) {
                this.pause();
            }
        }
    }

    /**
     * Vérifie si le navigateur supporte la synthèse vocale
     */
    static isSupported() {
        return 'speechSynthesis' in window;
    }
}

// Export pour utilisation en module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TextToSpeech;
}
