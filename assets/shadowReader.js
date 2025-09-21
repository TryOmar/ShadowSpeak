/**
 * ShadowReader - Main class for text-to-speech reading practice
 * Handles voice synthesis, sentence processing, and playback controls
 */
class ShadowReader {
    constructor() {
        this.voices = [];
        this.sentences = [];
        this.currentUtterance = null;
        this.currentSentenceIndex = -1;
        this.isPlaying = false;
        this.isPaused = false;
        this.startTime = null;
        this.practiceTimer = null;
        this.playAllMode = false;
        this.isProcessed = false;
        this.selectedVoiceIndex = null; // Store selected voice to prevent random changes
        this.autoDetectLanguage = true; // Enable auto-detection by default
        this.lastDetectedLanguage = null; // Track last detected language to avoid unnecessary changes
        
        this.init();
    }

    init() {
        this.loadVoices();
        this.setupEventListeners();
        window.speechSynthesis.onvoiceschanged = () => this.loadVoices();
    }

    loadVoices() {
        this.voices = speechSynthesis.getVoices();
        this.populateVoiceSelect();
    }

    populateVoiceSelect() {
        const voiceSelect = document.getElementById("voiceSelect");
        const currentSelection = voiceSelect.value; // Preserve current selection
        voiceSelect.innerHTML = "";

        const grouped = {};
        this.voices.forEach((voice, index) => {
            const lang = voice.lang.split('-')[0];
            if (!grouped[lang]) grouped[lang] = [];
            grouped[lang].push({ index, voice });
        });

        const priorityLangs = ['ar', 'en'];
        let defaultSelected = false;
        
        priorityLangs.forEach(lang => {
            if (grouped[lang]) {
                const optgroup = document.createElement("optgroup");
                optgroup.label = lang === 'ar' ? 'Arabic' : 'English';
                
                grouped[lang].forEach(({ index, voice }) => {
                    const option = document.createElement("option");
                    option.value = index;
                    option.textContent = voice.name;
                    
                    // Restore previous selection or select default
                    if (currentSelection && currentSelection === index.toString()) {
                        option.selected = true;
                        this.selectedVoiceIndex = index;
                        defaultSelected = true;
                    } else if (!defaultSelected && voice.default) {
                        option.selected = true;
                        this.selectedVoiceIndex = index;
                        defaultSelected = true;
                    }
                    
                    optgroup.appendChild(option);
                });
                
                voiceSelect.appendChild(optgroup);
                delete grouped[lang];
            }
        });

        Object.keys(grouped).sort().forEach(lang => {
            const optgroup = document.createElement("optgroup");
            optgroup.label = lang.toUpperCase();
            
            grouped[lang].forEach(({ index, voice }) => {
                const option = document.createElement("option");
                option.value = index;
                option.textContent = voice.name;
                
                // Restore previous selection
                if (currentSelection && currentSelection === index.toString()) {
                    option.selected = true;
                    this.selectedVoiceIndex = index;
                    defaultSelected = true;
                }
                
                optgroup.appendChild(option);
            });
            
            voiceSelect.appendChild(optgroup);
        });
        
        // If no voice was selected, select the first available voice
        if (!this.selectedVoiceIndex && this.voices.length > 0) {
            this.selectedVoiceIndex = 0;
            voiceSelect.selectedIndex = 0;
        }
    }

    setupEventListeners() {
        const speedControl = document.getElementById("speedControl");
        const pitchControl = document.getElementById("pitchControl");
        const inputText = document.getElementById("inputText");
        const voiceSelect = document.getElementById("voiceSelect");
        
        speedControl.addEventListener('input', (e) => {
            document.querySelector('#speedControl + .range-display').textContent = e.target.value + 'x';
        });
        
        pitchControl.addEventListener('input', (e) => {
            document.querySelector('#pitchControl + .range-display').textContent = e.target.value + 'x';
        });
        
        // Handle RTL for input text and auto-detect language
        inputText.addEventListener('input', (e) => {
            this.updateInputDirection(e.target.value);
            // Auto-detect language and change voice if enabled
            if (e.target.value.trim() && this.autoDetectLanguage) {
                this.autoSelectVoice(e.target.value);
            } else if (e.target.value.trim()) {
                this.checkLanguageMismatch(e.target.value);
            }
        });

        // Check for language mismatch when voice changes
        voiceSelect.addEventListener('change', (e) => {
            this.selectedVoiceIndex = e.target.value; // Store the selected voice
        });

    }

    detectLanguage(text) {
        const arabicRegex = /[\u0600-\u06FF]/g;
        const arabicMatches = text.match(arabicRegex) || [];
        const arabicCount = arabicMatches.length;
        const totalChars = text.replace(/\s/g, '').length;
        const arabicPercentage = totalChars > 0 ? arabicCount / totalChars : 0;
        
        return {
            direction: arabicPercentage > 0.3 ? 'rtl' : 'ltr',
            isArabic: arabicPercentage > 0.3,
            arabicPercentage: arabicPercentage
        };
    }

    updateInputDirection(text) {
        const inputText = document.getElementById("inputText");
        const langInfo = this.detectLanguage(text);
        
        if (langInfo.direction === 'rtl') {
            inputText.classList.add('rtl');
        } else {
            inputText.classList.remove('rtl');
        }
    }

    checkLanguageMismatch(text) {
        const langInfo = this.detectLanguage(text);
        const voiceSelect = document.getElementById("voiceSelect");
        const selectedVoiceIndex = voiceSelect.value;
        
        if (selectedVoiceIndex && this.voices[selectedVoiceIndex]) {
            const selectedVoice = this.voices[selectedVoiceIndex];
            const voiceLang = selectedVoice.lang.split('-')[0].toLowerCase();
            
            // If text is Arabic but voice is not Arabic
            if (langInfo.isArabic && voiceLang !== 'ar') {
                this.showLanguageWarning('Arabic text detected, but non-Arabic voice selected. Consider choosing an Arabic voice for better pronunciation.');
                return true;
            }
            // If text is not Arabic but Arabic voice is selected
            else if (!langInfo.isArabic && voiceLang === 'ar') {
                this.showLanguageWarning('Arabic voice selected, but text appears to be non-Arabic. Consider choosing an English voice for better pronunciation.');
                return true;
            }
        }
        
        this.hideLanguageWarning();
        return false;
    }

    showLanguageWarning(message) {
        let warning = document.getElementById('languageWarning');
        if (!warning) {
            warning = document.createElement('div');
            warning.id = 'languageWarning';
            warning.className = 'language-warning';
            
            // Insert after the voice selection box
            const voiceBox = document.querySelector('.voice-box');
            voiceBox.parentNode.insertBefore(warning, voiceBox.nextSibling);
        }
        
        warning.innerHTML = `
            <div class="warning-content">
                <span class="warning-icon">⚠️</span>
                <span class="warning-message">${message}</span>
                <button class="warning-close" onclick="this.parentElement.parentElement.style.display='none'">×</button>
            </div>
        `;
        warning.style.display = 'block';
    }

    hideLanguageWarning() {
        const warning = document.getElementById('languageWarning');
        if (warning) {
            warning.style.display = 'none';
        }
    }

    autoSelectVoice(text) {
        const langInfo = this.detectLanguage(text);
        const voiceSelect = document.getElementById("voiceSelect");
        
        const targetLang = langInfo.isArabic ? 'ar' : 'en';
        
        // Only auto-select if the language has actually changed
        if (this.lastDetectedLanguage === targetLang) {
            return; // Same language, don't change voice
        }
        
        this.lastDetectedLanguage = targetLang;
        
        // Find the best voice for the detected language
        let bestVoiceIndex = null;
        
        if (targetLang === 'en') {
            // For English, prioritize natural voices
            bestVoiceIndex = this.findBestEnglishVoice();
        } else {
            // For Arabic, use existing logic
            bestVoiceIndex = this.findBestArabicVoice();
        }
        
        // If we found a suitable voice and it's different from current selection
        if (bestVoiceIndex !== null && voiceSelect.value !== bestVoiceIndex.toString()) {
            voiceSelect.value = bestVoiceIndex;
            this.selectedVoiceIndex = bestVoiceIndex;
            this.hideLanguageWarning();
        } else if (bestVoiceIndex === null) {
            // No suitable voice found, show warning
            this.checkLanguageMismatch(text);
        }
    }

    findBestEnglishVoice() {
        // First, look for any voice with "(Natural)" in the name, prioritizing Andrew
        let bestIndex = null;
        let bestPriority = -1;
        
        // Look for Natural voices first
        for (let i = 0; i < this.voices.length; i++) {
            const voice = this.voices[i];
            const voiceLang = voice.lang.split('-')[0].toLowerCase();
            
            if (voiceLang === 'en' && voice.name.includes('(Natural)')) {
                // Andrew is the best Natural voice
                if (voice.name.toLowerCase().includes('andrew')) {
                    return i; // Return immediately if Andrew Natural is found
                }
                
                // Otherwise, store the first Natural voice found
                if (bestIndex === null) {
                    bestIndex = i;
                }
            }
        }
        
        // If we found a Natural voice (but not Andrew), return it
        if (bestIndex !== null) {
            return bestIndex;
        }
        
        // Fallback to other high-quality voices
        const preferredVoices = [
            // Most natural Windows voices
            'Microsoft Zira - English (United States)',
            'Microsoft Mark - English (United States)', 
            'Microsoft Hazel - English (Great Britain)',
            'Microsoft Susan - English (Great Britain)',
            
            // macOS natural voices (very high quality)
            'Samantha',
            'Alex',
            'Victoria',
            'Karen',
            'Daniel',
            'Moira',
            'Tessa',
            
            // Chrome/Edge enhanced voices
            'Google US English',
            'Google UK English Female',
            'Google UK English Male'
        ];

        let fallbackIndex = null;
        let fallbackPriority = -1;

        // Look for exact name matches from preferred list
        for (let i = 0; i < this.voices.length; i++) {
            const voice = this.voices[i];
            const voiceLang = voice.lang.split('-')[0].toLowerCase();
            
            if (voiceLang === 'en') {
                // Check for exact name matches
                for (let j = 0; j < preferredVoices.length; j++) {
                    if (voice.name === preferredVoices[j]) {
                        if (fallbackPriority === -1 || j < fallbackPriority) {
                            fallbackIndex = i;
                            fallbackPriority = j;
                        }
                    }
                }
            }
        }

        // If no exact match, look for quality indicators (but avoid David)
        if (fallbackIndex === null) {
            for (let i = 0; i < this.voices.length; i++) {
                const voice = this.voices[i];
                const voiceLang = voice.lang.split('-')[0].toLowerCase();
                
                if (voiceLang === 'en') {
                    const voiceName = voice.name.toLowerCase();
                    
                    // Skip David entirely
                    if (voiceName.includes('david')) {
                        continue;
                    }
                    
                    // Prefer Microsoft voices or enhanced voices
                    if (voiceName.includes('microsoft') || voiceName.includes('enhanced') || 
                        voiceName.includes('premium') || voiceName.includes('hd')) {
                        fallbackIndex = i;
                        break;
                    }
                    
                    // Fallback to any English voice (except David)
                    if (fallbackIndex === null) {
                        fallbackIndex = i;
                    }
                }
            }
        }

        return fallbackIndex;
    }

    findBestArabicVoice() {
        let bestIndex = null;
        
        // Look for Arabic voices with quality indicators
        for (let i = 0; i < this.voices.length; i++) {
            const voice = this.voices[i];
            const voiceLang = voice.lang.split('-')[0].toLowerCase();
            
            if (voiceLang === 'ar') {
                bestIndex = i;
                // Prefer high-quality Arabic voices
                if (voice.name.includes('Enhanced') || voice.name.includes('Premium') || 
                    voice.name.includes('Natural') || voice.default) {
                    break;
                }
            }
        }
        
        return bestIndex;
    }


    splitIntoSentences(text) {
        const sentences = text.match(/[^.!؟?;]+[.!؟?;]*/g) || [text];
        return sentences.map(s => s.trim()).filter(s => s.length > 0);
    }

    processText() {
        const inputText = document.getElementById("inputText").value.trim();
        if (!inputText) {
            alert('Please enter some text first');
            return;
        }

        // Update input direction based on the text
        this.updateInputDirection(inputText);

        // Check for language mismatch
        this.checkLanguageMismatch(inputText);

        this.sentences = this.splitIntoSentences(inputText);
        this.currentSentenceIndex = -1;
        this.isProcessed = true;
        this.playAllMode = false;
        this.isPaused = false;
        this.renderSentences();
        this.updateStats();
        this.startPracticeTimer();
        this.updateStatus('Text processed. Click on any sentence to play.');
        
        document.getElementById("playbackControls").classList.add('show');
        document.getElementById("statsPanel").style.display = 'flex';
    }

    renderSentences() {
        const output = document.getElementById("output");
        output.innerHTML = "";

        this.sentences.forEach((sentence, index) => {
            const langInfo = this.detectLanguage(sentence);
            const sentenceDiv = this.createSentenceCard(sentence, index, langInfo);
            output.appendChild(sentenceDiv);
        });
    }

    createSentenceCard(sentence, index, langInfo) {
        const card = document.createElement("div");
        card.className = "sentence-card";
        card.onclick = () => this.playSentence(sentence, index, card);

        const content = document.createElement("div");
        content.className = "sentence-content";

        const sentenceId = document.createElement("div");
        sentenceId.className = "sentence-id";
        sentenceId.textContent = index + 1;

        const textDiv = document.createElement("div");
        textDiv.className = `sentence-text ${langInfo.direction}`;
        
        const textContent = document.createElement("div");
        textContent.className = "text-content";
        textContent.innerHTML = this.wrapWordsInSpans(sentence);
        textDiv.appendChild(textContent);

        content.appendChild(sentenceId);
        content.appendChild(textDiv);
        card.appendChild(content);

        return card;
    }

    wrapWordsInSpans(sentence) {
        // Split by spaces while preserving them
        const parts = sentence.split(/(\s+)/);
        return parts.map(part => {
            if (part.trim()) {
                // Wrap non-whitespace parts in word spans
                return `<span class="word">${part}</span>`;
            }
            // Return whitespace as-is to maintain proper spacing
            return part;
        }).join('');
    }

    playSentence(sentence, index, container) {
        this.stopCurrentUtterance();
        this.clearAllHighlights();
        
        this.currentSentenceIndex = index;
        container.classList.add('playing');

        const utterance = new SpeechSynthesisUtterance(sentence);
        
        // Use stored voice index to prevent random changes during play/pause
        const voiceSelect = document.getElementById("voiceSelect");
        let voiceIndex = this.selectedVoiceIndex;
        
        // If no stored voice, get current selection and store it
        if (voiceIndex === null || voiceIndex === undefined) {
            voiceIndex = parseInt(voiceSelect.value) || 0;
            this.selectedVoiceIndex = voiceIndex;
        }
        
        // Ensure we have a valid voice
        if (this.voices[voiceIndex]) {
            utterance.voice = this.voices[voiceIndex];
        } else if (this.voices.length > 0) {
            // Fallback to first available voice
            utterance.voice = this.voices[0];
            this.selectedVoiceIndex = 0;
            voiceSelect.value = 0;
        }

        utterance.rate = parseFloat(document.getElementById("speedControl").value);
        utterance.pitch = parseFloat(document.getElementById("pitchControl").value);

        const textDiv = container.querySelector('.text-content');
        
        utterance.onboundary = (event) => {
            if (event.name === "word") {
                // Use requestAnimationFrame for smoother highlighting
                requestAnimationFrame(() => {
                    this.highlightCurrentWord(textDiv, event.charIndex, sentence);
                });
            }
        };

        utterance.onstart = () => {
            this.isPlaying = true;
            this.updateCurrentSentenceStats(index);
            this.updateStatus(`Playing sentence ${index + 1}`);
        };

        utterance.onend = () => {
            this.isPlaying = false;
            container.classList.remove('playing');
            this.clearHighlight(textDiv);
            
            if (this.playAllMode && index < this.sentences.length - 1) {
                setTimeout(() => {
                    this.currentSentenceIndex++;
                    this.playNextSentence();
                }, 500);
            } else if (this.playAllMode) {
                this.playAllMode = false;
                this.updatePlayAllButton();
                this.updateStatus('Finished playing all sentences');
            } else {
                this.updateStatus('Sentence completed');
            }
        };

        utterance.onerror = () => {
            this.isPlaying = false;
            container.classList.remove('playing');
            this.clearHighlight(textDiv);
            this.updateStatus('Error occurred during playback');
        };

        this.currentUtterance = utterance;
        speechSynthesis.speak(utterance);
    }

    highlightCurrentWord(container, charIndex, sentence) {
        const words = container.querySelectorAll('.word');
        if (!words.length) return;

        // Clear previous highlights
        words.forEach(word => word.classList.remove('highlight'));

        // More robust word mapping algorithm
        let currentWordIndex = -1;
        let accumulatedLength = 0;
        
        // Process each word element and match with speech boundary
        for (let i = 0; i < words.length; i++) {
            const wordElement = words[i];
            const wordText = wordElement.textContent.trim();
            
            // Calculate word boundaries including spaces
            const wordStart = accumulatedLength;
            const wordEnd = accumulatedLength + wordText.length;
            
            // Check if the speech boundary falls within this word
            if (charIndex >= wordStart && charIndex <= wordEnd) {
                currentWordIndex = i;
                break;
            }
            
            // Move to next word position (word + typical space)
            accumulatedLength = wordEnd;
            
            // Account for spaces between words in the original sentence
            const remainingSentence = sentence.substring(accumulatedLength);
            const nextWordMatch = remainingSentence.match(/^\s+/);
            if (nextWordMatch) {
                accumulatedLength += nextWordMatch[0].length;
            } else if (i < words.length - 1) {
                accumulatedLength += 1; // Default single space
            }
        }
        
        // If no exact match found, use proximity matching
        if (currentWordIndex === -1) {
            let minDistance = Infinity;
            for (let i = 0; i < words.length; i++) {
                const wordElement = words[i];
                const wordText = wordElement.textContent.trim();
                const wordPosition = sentence.indexOf(wordText, i > 0 ? sentence.indexOf(words[i-1].textContent) + words[i-1].textContent.length : 0);
                
                if (wordPosition !== -1) {
                    const distance = Math.abs(charIndex - wordPosition);
                    if (distance < minDistance) {
                        minDistance = distance;
                        currentWordIndex = i;
                    }
                }
            }
        }

        // Apply highlight with smooth transition
        if (currentWordIndex >= 0 && words[currentWordIndex]) {
            const targetWord = words[currentWordIndex];
            targetWord.classList.add('highlight');
            
            // Auto focus disabled - no longer scrolls to current word
            // targetWord.scrollIntoView({
            //     behavior: 'smooth',
            //     block: 'nearest',
            //     inline: 'center'
            // });
        }
    }

    clearHighlight(container) {
        const words = container.querySelectorAll('.word');
        words.forEach(word => word.classList.remove('highlight'));
    }

    clearAllHighlights() {
        document.querySelectorAll('.sentence-card').forEach(card => {
            card.classList.remove('playing');
        });
        document.querySelectorAll('.word.highlight').forEach(word => {
            word.classList.remove('highlight');
        });
    }

    togglePlayAll() {
        if (this.sentences.length === 0) {
            alert('Please process some text first');
            return;
        }

        if (this.playAllMode) {
            // Pause playback
            this.playAllMode = false;
            this.isPaused = true;
            this.stopCurrentUtterance();
            this.updateStatus(`Paused at sentence ${this.currentSentenceIndex + 1}`);
        } else if (this.isPaused) {
            // Resume from where we paused
            this.playAllMode = true;
            this.isPaused = false;
            this.playNextSentence();
            this.updateStatus(`Resumed from sentence ${this.currentSentenceIndex + 1}`);
        } else {
            // Start playing - continue from last played sentence or start from beginning
            this.playAllMode = true;
            this.isPaused = false;
            
            // If no sentence has been played yet, start from beginning
            if (this.currentSentenceIndex === -1) {
                this.currentSentenceIndex = 0;
                this.updateStatus('Starting playback from beginning');
            } else {
                // Continue from the last played sentence
                this.updateStatus(`Continuing from sentence ${this.currentSentenceIndex + 1}`);
            }
            
            this.playNextSentence();
        }

        this.updatePlayAllButton();
    }

    updatePlayAllButton() {
        const btn = document.getElementById('playAllBtn');
        if (this.playAllMode) {
            btn.textContent = '⏸';
            btn.title = 'Pause';
            btn.classList.add('active');
        } else if (this.isPaused) {
            btn.textContent = '▶';
            btn.title = 'Resume';
            btn.classList.remove('active');
        } else {
            btn.textContent = '▶';
            btn.title = 'Play All';
            btn.classList.remove('active');
        }
    }

    playNextSentence() {
        if (this.currentSentenceIndex < this.sentences.length) {
            const sentence = this.sentences[this.currentSentenceIndex];
            const sentenceCard = document.querySelectorAll('.sentence-card')[this.currentSentenceIndex];
            
            this.playSentence(sentence, this.currentSentenceIndex, sentenceCard);
        }
    }

    nextSentence() {
        if (!this.isProcessed) return;
        
        if (this.currentSentenceIndex < this.sentences.length - 1) {
            const nextIndex = this.currentSentenceIndex + 1;
            const sentence = this.sentences[nextIndex];
            const sentenceCard = document.querySelectorAll('.sentence-card')[nextIndex];
            this.playSentence(sentence, nextIndex, sentenceCard);
        }
    }

    previousSentence() {
        if (!this.isProcessed) return;
        
        if (this.currentSentenceIndex > 0) {
            const prevIndex = this.currentSentenceIndex - 1;
            const sentence = this.sentences[prevIndex];
            const sentenceCard = document.querySelectorAll('.sentence-card')[prevIndex];
            this.playSentence(sentence, prevIndex, sentenceCard);
        }
    }

    stopAll() {
        this.stopCurrentUtterance();
        this.playAllMode = false;
        this.isPaused = false;
        this.clearAllHighlights();
        this.updatePlayAllButton();
        this.updateStatus('Stopped');
        
        // Reset to beginning for next play
        this.currentSentenceIndex = -1;
    }

    stopCurrentUtterance() {
        if (this.currentUtterance) {
            speechSynthesis.cancel();
            this.isPlaying = false;
            this.currentUtterance = null;
        }
    }

    clearText() {
        document.getElementById("inputText").value = '';
        document.getElementById("output").innerHTML = `
            <div class="empty-state">
                <h3>Ready</h3>
                <p>Enter text above and click Process Text to begin</p>
            </div>
        `;
        document.getElementById("playbackControls").classList.remove('show');
        document.getElementById("statsPanel").style.display = 'none';
        this.stopAll();
        this.sentences = [];
        this.currentSentenceIndex = -1;
        this.isProcessed = false;
        this.stopPracticeTimer();
        this.updateStatus('Ready');
    }

    updateStats() {
        const totalSentences = this.sentences.length;
        const totalWords = this.sentences.reduce((count, sentence) => {
            return count + sentence.split(/\s+/).filter(word => word.trim()).length;
        }, 0);

        document.getElementById("totalSentences").textContent = totalSentences;
        document.getElementById("totalWords").textContent = totalWords;
    }

    updateCurrentSentenceStats(index) {
        document.getElementById("currentSentence").textContent = index + 1;
    }

    updateStatus(message) {
        document.getElementById("currentStatus").textContent = message;
    }

    startPracticeTimer() {
        this.startTime = Date.now();
        this.practiceTimer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            document.getElementById("practiceTime").textContent = elapsed + 's';
        }, 1000);
    }

    stopPracticeTimer() {
        if (this.practiceTimer) {
            clearInterval(this.practiceTimer);
            this.practiceTimer = null;
        }
    }
}
