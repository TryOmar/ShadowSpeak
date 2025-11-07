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
        this.mediaStream = null;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.recordings = [];
        this.recordingSentenceIndex = null;
        this.recordingTimeout = null;
        this.maxRecordingDuration = 15000; // 15 seconds default per sentence
        this.recordingCompletionCallback = null;
        this.shouldSaveRecording = true;
        this.isPlayingUserRecordings = false;
        this.playbackRecordingIndex = -1;
        this.lastPlayedRecordingIndex = -1; // Track last played recording for continuation
        this.recordingPlayer = new Audio();
        this.recordingResolver = null;
        this.recordingRejecter = null;
        this.recordingHighlightInterval = null; // For word highlighting during recorded audio playback
        this.isRecording = false;
        this.microphoneEnabled = false;
        this.nextRecordingForceIndex = null;
        this.silenceDetectionRaf = null;
        this.audioContext = null;
        this.audioSourceNode = null;
        this.audioProcessorNode = null;
        this.audioAnalyserNode = null;
        this.audioMonitorData = null;
        this.lastVoiceActivity = null;
        this.recordingStartTimestamp = null;
        this.silenceThreshold = 0.04;
        this.silenceDuration = 1200;
        this.minRecordingDuration = 800;
        this.rmsThreshold = 0.01;
        this.silenceDurationMs = 1200;
        this.minRecordingDurationMs = 700;
        this.silenceStartTime = null;
        
        this.init();
        this.updatePlayRecordingsButton();
        this.recordingPlayer.addEventListener('ended', () => this.handleRecordingPlaybackEnd());
        this.recordingPlayer.addEventListener('error', () => this.handleRecordingPlaybackEnd(true));
    }

    init() {
        this.loadVoices();
        this.setupEventListeners();
        const micToggle = document.getElementById('micToggle');
        if (micToggle) {
            this.setMicrophoneEnabled(micToggle.checked, { silent: true });
        }
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
        this.resetRecordings(this.sentences.length);
        this.currentSentenceIndex = -1;
        this.isProcessed = true;
        this.playAllMode = false;
        this.isPaused = false;
        this.stopUserRecordings(false);
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
        card.dataset.index = index;
        card.onclick = () => this.playSentence(sentence, index, card, { forceRecord: false });

        const content = document.createElement("div");
        content.className = "sentence-content";

        const textDiv = document.createElement("div");
        textDiv.className = `sentence-text ${langInfo.direction}`;
        
        const textContent = document.createElement("div");
        textContent.className = "text-content";
        textContent.innerHTML = this.wrapWordsInSpans(sentence);
        textDiv.appendChild(textContent);

        const sentenceActions = document.createElement("div");
        sentenceActions.className = "sentence-actions";

        // Recording duration box (only shown when recording exists)
        const recordingDurationBox = document.createElement("div");
        recordingDurationBox.className = "recording-duration-box";
        recordingDurationBox.dataset.index = index;
        recordingDurationBox.style.display = this.recordings[index] ? 'inline-flex' : 'none';
        recordingDurationBox.setAttribute('role', 'button');
        recordingDurationBox.setAttribute('tabindex', '0');
        recordingDurationBox.setAttribute('aria-label', `Play recording for sentence ${index + 1}`);
        recordingDurationBox.addEventListener('click', (event) => {
            event.stopPropagation();
            this.handlePlayRecordingClick(index);
        });
        recordingDurationBox.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                event.stopPropagation();
                this.handlePlayRecordingClick(index);
            }
        });
        
        // Set initial duration or load it
        if (this.recordings[index]) {
            this.loadRecordingDuration(index, recordingDurationBox);
        } else {
            recordingDurationBox.textContent = '--:--';
        }

        // Mic button (for recording)
        const micButton = document.createElement("button");
        micButton.type = "button";
        micButton.className = "sentence-mic";
        micButton.textContent = '🎙';
        micButton.setAttribute('aria-label', `Record sentence ${index + 1}`);
        micButton.dataset.index = index;
        micButton.addEventListener('click', (event) => {
            event.stopPropagation();
            this.handleMicIconClick(index);
        });

        sentenceActions.appendChild(recordingDurationBox);
        sentenceActions.appendChild(micButton);

        content.appendChild(textDiv);
        content.appendChild(sentenceActions);
        card.appendChild(content);

        // Create hidden audio player for playback via speaker button
        const audioPlayer = document.createElement("audio");
        audioPlayer.className = "recorded-audio";
        audioPlayer.style.display = 'none'; // Always hidden - only used programmatically
        audioPlayer.style.position = 'absolute';
        audioPlayer.style.visibility = 'hidden';

        if (this.recordings[index]) {
            audioPlayer.src = this.recordings[index].url;
        }

        card.appendChild(audioPlayer);

        this.updateMicIconState(index, card);
        this.updateRecordingDurationBox(index, card);

        return card;
    }

    loadRecordingDuration(index, durationBox) {
        if (!this.recordings[index] || !this.recordings[index].url) {
            if (durationBox) {
                durationBox.textContent = '--:--';
            }
            return;
        }

        const audio = new Audio(this.recordings[index].url);
        audio.addEventListener('loadedmetadata', () => {
            const duration = audio.duration;
            const formattedDuration = this.formatDuration(duration);
            if (durationBox) {
                durationBox.textContent = formattedDuration;
            }
            // Store duration for quick access
            if (this.recordings[index]) {
                this.recordings[index].duration = duration;
            }
        });
        audio.addEventListener('error', () => {
            if (durationBox) {
                durationBox.textContent = '--:--';
            }
        });
    }

    formatDuration(seconds) {
        if (!seconds || isNaN(seconds)) {
            return '--:--';
        }
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
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

    playSentence(sentence, index, container, options = {}) {
        const { forceRecord = false, autoRecordMissing = false } = options;

        if (!container) {
            container = document.querySelector(`.sentence-card[data-index="${index}"]`);
        }

        const shouldAutoRecordMissing = autoRecordMissing && this.microphoneEnabled && !this.recordings[index];

        // Plan recording when explicitly requested or when auto-recording missing sentences is enabled during play-all
        const shouldPlanRecording = this.microphoneEnabled && (forceRecord || shouldAutoRecordMissing);

        this.stopCurrentUtterance();
        this.abortRecording(true);
        this.stopUserRecordings();
        this.clearAllHighlights();

        this.currentSentenceIndex = index;
        this.nextRecordingForceIndex = forceRecord ? index : null;

        if (container) {
            container.classList.add('playing');
        }

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

        const textDiv = container ? container.querySelector('.text-content') : null;

        utterance.onboundary = (event) => {
            if (event.name === "word" && textDiv) {
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
            if (shouldPlanRecording) {
                // Don't show recording state yet - wait until playback finishes
                this.updateRecordingUI(index, { state: 'idle' });
            } else {
                this.updateRecordingUI(index, { state: this.recordings[index] ? 'saved' : 'idle' });
            }
        };

        utterance.onend = () => {
            this.isPlaying = false;
            if (container) {
                container.classList.remove('playing');
            }
            if (textDiv) {
                this.clearHighlight(textDiv);
            }
            // Only auto-record if forceRecord was true (clicked mic button)
            if (shouldPlanRecording) {
                // Now show recording state after playback finishes
                this.updateRecordingUI(index, { state: 'preparing' });
                const shouldAutoContinue = this.playAllMode && index < this.sentences.length - 1;
                this.handleSentencePlaybackComplete(index, container, shouldAutoContinue);
            } else {
                // Just update UI and continue if in playAllMode
                this.updateRecordingUI(index, { state: this.recordings[index] ? 'saved' : 'idle' });
                const shouldAutoContinue = this.playAllMode && index < this.sentences.length - 1;
                if (shouldAutoContinue) {
                    setTimeout(() => {
                        if (this.playAllMode) {
                            this.playNextSentence();
                        }
                    }, 400);
                } else if (this.playAllMode) {
                    this.playAllMode = false;
                    this.updatePlayAllButton();
                    this.updateStatus('Finished playing all sentences');
                } else {
                    this.updateStatus('Sentence completed');
                }
            }
        };

        utterance.onerror = () => {
            this.isPlaying = false;
            if (container) {
                container.classList.remove('playing');
            }
            if (textDiv) {
                this.clearHighlight(textDiv);
            }
            this.updateStatus('Error occurred during playback');
            this.updateRecordingUI(index, { state: 'idle' });
        };

        this.currentUtterance = utterance;
        speechSynthesis.speak(utterance);
    }

    handleSentencePlaybackComplete(index, container, shouldAutoContinue) {
        const finishPlayback = () => {
            if (shouldAutoContinue && this.playAllMode) {
                setTimeout(() => {
                    if (this.playAllMode) {
                        this.playNextSentence();
                    }
                }, 400);
            } else if (this.playAllMode) {
                this.playAllMode = false;
                this.updatePlayAllButton();
                this.updateStatus('Finished playing all sentences');
            } else {
                this.updateStatus('Sentence completed');
            }
        };

        const shouldRecord = this.shouldRecordSentence(index);

        if (!shouldRecord) {
            this.updateRecordingUI(index, { state: this.recordings[index] ? 'saved' : 'idle' });
            finishPlayback();
            return;
        }

        const onRecordingComplete = () => {
            this.updateRecordingUI(index, { state: this.recordings[index] ? 'saved' : 'idle' });
            finishPlayback();
        };

        this.startRecordingForSentence(index, container, onRecordingComplete)
            .catch(() => {
                onRecordingComplete();
            });
    }

    shouldRecordSentence(index) {
        if (!Array.isArray(this.sentences) || !this.sentences[index]) {
            this.nextRecordingForceIndex = null;
            return false;
        }

        const forceRecording = this.nextRecordingForceIndex === index;
        this.nextRecordingForceIndex = null;

        if (!this.microphoneEnabled) {
            return false;
        }

        if (forceRecording) {
            return true;
        }

        return !this.recordings[index];
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

    async ensureMicrophoneAccess() {
        if (this.mediaStream) {
            const hasLiveTrack = this.mediaStream.getTracks().some(track => track.readyState === 'live');
            if (hasLiveTrack) {
                return this.mediaStream;
            }
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.mediaStream = stream;
        return stream;
    }

    async startRecordingForSentence(index, container, onComplete) {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            this.updateRecordingUI(index, { state: 'error', message: 'Microphone not supported in this browser.' });
            throw new Error('microphone-not-available');
        }

        try {
            const stream = await this.ensureMicrophoneAccess();

            if (this.isRecording) {
                this.abortRecording(true);
            }

            const card = container || document.querySelector(`.sentence-card[data-index="${index}"]`);

            this.recordingSentenceIndex = index;
            this.recordingCompletionCallback = onComplete || null;
            this.shouldSaveRecording = true;
            this.recordedChunks = [];
            this.isRecording = true;

            this.updateRecordingUI(index, { state: 'recording', message: 'Recording...' });

            this.mediaRecorder = new MediaRecorder(stream);
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };
            this.mediaRecorder.onstop = () => {
                this.handleRecordingStop(index, card);
            };
            this.mediaRecorder.onerror = () => {
                this.shouldSaveRecording = false;
                this.updateRecordingUI(index, { state: 'error', message: 'Recording error' });
                this.updateStatus('Recording interrupted. Please try again.');
                this.stopRecording();
            };

            this.mediaRecorder.start();
            this.recordingStartTimestamp = performance.now();
            this.lastVoiceActivity = this.recordingStartTimestamp;
            this.startSilenceDetection(stream);

            this.updateStatus(`Recording your voice for sentence ${index + 1}`);
            if (this.recordingTimeout) {
                clearTimeout(this.recordingTimeout);
            }
            this.recordingTimeout = setTimeout(() => {
                if (this.isRecording && this.recordingSentenceIndex === index) {
                    this.stopRecording();
                }
            }, this.maxRecordingDuration);

            return new Promise((resolve, reject) => {
                this.recordingResolver = resolve;
                this.recordingRejecter = reject;
            });
        } catch (error) {
            this.updateRecordingUI(index, { state: 'error', message: 'Microphone access denied' });
            this.updateStatus('Microphone access denied. Enable microphone permissions to record your voice.');
            throw error;
        }
    }

    stopRecording(skipCallback = false) {
        if (this.recordingTimeout) {
            clearTimeout(this.recordingTimeout);
            this.recordingTimeout = null;
        }

        if (skipCallback) {
            this.recordingCompletionCallback = null;
        }

        this.stopSilenceMonitor();

        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
    }

    abortRecording(discard = false) {
        if (!this.isRecording) {
            return;
        }

        if (discard) {
            this.shouldSaveRecording = false;
        }

        this.stopRecording(true);
    }

    handleRecordingStop(index, container) {
        if (this.recordingTimeout) {
            clearTimeout(this.recordingTimeout);
            this.recordingTimeout = null;
        }

        this.stopSilenceMonitor();

        const resolver = this.recordingResolver;
        const rejecter = this.recordingRejecter;
        this.recordingResolver = null;
        this.recordingRejecter = null;

        const completionCallback = this.recordingCompletionCallback;
        this.recordingCompletionCallback = null;

        const mimeType = this.mediaRecorder && this.mediaRecorder.mimeType ? this.mediaRecorder.mimeType : 'audio/webm';
        this.mediaRecorder = null;
        this.isRecording = false;
        this.recordingStartTimestamp = null;
        this.lastVoiceActivity = null;

        let saved = false;

        if (this.shouldSaveRecording && this.recordedChunks.length > 0) {
            const blob = new Blob(this.recordedChunks, { type: mimeType });
            const url = URL.createObjectURL(blob);

            const existing = this.recordings[index];
            if (existing && existing.url) {
                URL.revokeObjectURL(existing.url);
            }

            this.recordings[index] = { blob, url };
            saved = true;
            // Load duration after recording is saved
            const card = document.querySelector(`.sentence-card[data-index="${index}"]`);
            const durationBox = card ? card.querySelector('.recording-duration-box') : null;
            this.loadRecordingDuration(index, durationBox);
            this.updateRecordingUI(index, { state: 'saved', url, message: 'Recorded' });
            this.updateStatus(`Saved recording for sentence ${index + 1}`);
        } else {
            this.updateRecordingUI(index, { state: 'idle' });
        }

        this.recordedChunks = [];
        this.shouldSaveRecording = true;
        this.recordingSentenceIndex = null;

        if (resolver) {
            resolver(saved);
        } else if (rejecter) {
            rejecter(new Error('recording-cancelled'));
        }

        this.updatePlayRecordingsButton();

        if (completionCallback) {
            if (saved) {
                setTimeout(() => completionCallback(), 400);
            } else {
                completionCallback();
            }
        }
    }

    updateRecordingUI(index, options = {}) {
        const card = document.querySelector(`.sentence-card[data-index="${index}"]`);
        if (!card) return;

        const audio = card.querySelector('.recorded-audio');
        const micButton = card.querySelector('.sentence-mic');

        if (!audio) {
            return;
        }

        const { state, message, url } = options;

        // Update card recording state class
        card.classList.toggle('recording', state === 'recording' || state === 'preparing');

        if (state === 'recording') {
            if (micButton) {
                micButton.classList.remove('recorded', 'unrecorded');
                micButton.classList.add('recording');
            }
            audio.pause();
            audio.currentTime = 0;
        } else if (state === 'preparing') {
            if (micButton) {
                micButton.classList.remove('recorded', 'unrecorded');
                micButton.classList.add('recording');
            }
            if (this.recordings[index]) {
                audio.src = this.recordings[index].url;
            } else {
                audio.removeAttribute('src');
            }
        } else if (state === 'saved') {
            // Remove recording class when saved
            card.classList.remove('recording');
            if (url) {
                audio.src = url;
                audio.load();
            } else if (this.recordings[index] && this.recordings[index].url) {
                audio.src = this.recordings[index].url;
                audio.load();
            } else {
                audio.removeAttribute('src');
            }
        } else if (state === 'error') {
            card.classList.remove('recording');
            if (this.recordings[index] && this.recordings[index].url) {
                audio.src = this.recordings[index].url;
                audio.load();
            } else {
                audio.removeAttribute('src');
            }
        } else {
            // Idle state
            card.classList.remove('recording');
            if (this.recordings[index] && this.recordings[index].url) {
                audio.src = this.recordings[index].url;
                audio.load();
            } else {
                audio.removeAttribute('src');
            }
        }

        this.updateMicIconState(index, card);
        this.updateRecordingDurationBox(index, card);
    }

    updateRecordingDurationBox(index, cardOverride = null) {
        const card = cardOverride || document.querySelector(`.sentence-card[data-index="${index}"]`);
        if (!card) return;

        const durationBox = card.querySelector('.recording-duration-box');
        if (!durationBox) return;

        // Only show duration box if recording exists
        if (this.recordings[index]) {
            durationBox.style.display = 'inline-flex';
            // If we already have the duration stored, use it
            if (this.recordings[index].duration) {
                durationBox.textContent = this.formatDuration(this.recordings[index].duration);
            } else {
                // Otherwise load it
                this.loadRecordingDuration(index, durationBox);
            }
        } else {
            durationBox.style.display = 'none';
            durationBox.textContent = '--:--';
        }
    }

    updateMicIconState(index, cardOverride = null) {
        const card = cardOverride || document.querySelector(`.sentence-card[data-index="${index}"]`);
        if (!card) return;

        const micButton = card.querySelector('.sentence-mic');
        if (!micButton) return;

        micButton.classList.remove('recording', 'recorded', 'unrecorded');

        if (this.isRecording && this.recordingSentenceIndex === index) {
            micButton.classList.add('recording');
            micButton.textContent = '🎙';
        } else if (this.recordings[index]) {
            micButton.classList.add('recorded');
            micButton.textContent = '🎙';
        } else {
            micButton.classList.add('unrecorded');
            micButton.textContent = '🎙';
        }

        // Always show the button, but disable if mic is not enabled
        micButton.disabled = !this.microphoneEnabled;

        if (this.isRecording && this.recordingSentenceIndex === index) {
            micButton.setAttribute('aria-label', `Recording in progress for sentence ${index + 1}`);
            micButton.title = 'Recording in progress';
        } else if (this.recordings[index]) {
            micButton.setAttribute('aria-label', `Re-record sentence ${index + 1}`);
            micButton.title = this.microphoneEnabled ? 'Re-record this sentence' : 'Enable the microphone toggle to re-record';
        } else {
            micButton.setAttribute('aria-label', this.microphoneEnabled ? `Record sentence ${index + 1}` : `Enable the microphone toggle to record sentence ${index + 1}`);
            micButton.title = this.microphoneEnabled ? 'Record this sentence' : 'Enable the microphone toggle to record';
        }
    }

    updateAllMicIcons() {
        if (!Array.isArray(this.sentences)) {
            return;
        }

        this.sentences.forEach((_, index) => {
            this.updateMicIconState(index);
            this.updateRecordingDurationBox(index);
        });
    }

    handleMicIconClick(index) {
        if (!this.microphoneEnabled) {
            this.updateStatus('Enable the microphone toggle to record.');
            const toggle = document.getElementById('micToggle');
            if (toggle) {
                toggle.focus();
            }
            return;
        }

        if (!this.sentences || !this.sentences[index]) {
            return;
        }

        const card = document.querySelector(`.sentence-card[data-index="${index}"]`);

        this.playAllMode = false;
        this.isPaused = false;
        this.updatePlayAllButton();

        this.stopCurrentUtterance();
        this.stopUserRecordings();
        this.abortRecording(true);
        this.updateStatus(`Preparing to record sentence ${index + 1}`);

        this.playSentence(this.sentences[index], index, card, { forceRecord: true });
    }

    handlePlayRecordingClick(index) {
        if (!this.recordings || !this.recordings[index]) {
            return;
        }

        const card = document.querySelector(`.sentence-card[data-index="${index}"]`);
        const audioPlayer = card ? card.querySelector('.recorded-audio') : null;

        if (!audioPlayer || !audioPlayer.src) {
            return;
        }

        // Stop any current playback
        this.stopCurrentUtterance();
        this.stopUserRecordings();
        this.abortRecording(true);
        this.clearAllHighlights();

        // Play the recorded audio
        this.isPlayingUserRecordings = true;
        this.playbackRecordingIndex = index;
        this.lastPlayedRecordingIndex = index;
        audioPlayer.currentTime = 0;
        
        // Add playing class and start highlighting
        if (card) {
            card.classList.add('playing');
        }
        this.startRecordingHighlight(index, card, audioPlayer);
        
        const playPromise = audioPlayer.play();
        if (playPromise && typeof playPromise.then === 'function') {
            playPromise.catch(() => {
                this.updateStatus('Unable to play recording');
                this.isPlayingUserRecordings = false;
                this.playbackRecordingIndex = -1;
                if (card) {
                    card.classList.remove('playing');
                }
                this.stopRecordingHighlight();
            });
        }

        this.updateStatus(`Playing your recording for sentence ${index + 1}`);

        // Handle when audio ends
        const onEnded = () => {
            audioPlayer.removeEventListener('ended', onEnded);
            this.isPlayingUserRecordings = false;
            this.playbackRecordingIndex = -1;
            if (card) {
                card.classList.remove('playing');
            }
            this.stopRecordingHighlight();
            this.updateStatus('Recording playback completed');
        };
        audioPlayer.addEventListener('ended', onEnded);
    }

    setMicrophoneEnabled(enabled, options = {}) {
        const { silent = false } = options;
        const shouldEnable = Boolean(enabled);

        if (this.microphoneEnabled === shouldEnable) {
            this.updateAllMicIcons();
            return;
        }

        this.microphoneEnabled = shouldEnable;

        const toggle = document.getElementById('micToggle');
        if (toggle && toggle.checked !== shouldEnable) {
            toggle.checked = shouldEnable;
        }

        if (!shouldEnable) {
            this.abortRecording(true);
            this.stopSilenceMonitor();
            this.releaseMediaStream();
            this.releaseAudioContext();
            if (!silent) {
                this.updateStatus('Microphone disabled. Playback only.');
            }
        } else if (!silent) {
            this.updateStatus('Microphone enabled. Recording will start after playback.');
        }

        this.updateAllMicIcons();
    }

    startSilenceDetection(stream) {
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) {
                return;
            }

            if (!this.audioContext) {
                this.audioContext = new AudioContextClass();
            }

            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume().catch(() => {});
            }

            if (this.audioSourceNode) {
                try {
                    this.audioSourceNode.disconnect();
                } catch (error) {
                    console.warn('Unable to disconnect previous audio source', error);
                }
            }

            this.stopSilenceMonitor();

            this.audioSourceNode = this.audioContext.createMediaStreamSource(stream);
            this.audioProcessorNode = this.audioContext.createScriptProcessor(4096, 1, 1);
            this.audioSourceNode.connect(this.audioProcessorNode);
            this.audioProcessorNode.connect(this.audioContext.destination);

            this.silenceStartTime = null;

            this.audioProcessorNode.onaudioprocess = (event) => {
                if (!this.isRecording || !this.mediaRecorder || this.mediaRecorder.state !== 'recording') {
                    return;
                }

                const input = event.inputBuffer.getChannelData(0);
                let sum = 0;
                for (let i = 0; i < input.length; i++) {
                    sum += input[i] * input[i];
                }
                const rms = Math.sqrt(sum / input.length);

                if (rms > this.rmsThreshold) {
                    this.silenceStartTime = null;
                    return;
                }

                const now = performance.now();
                if (!this.silenceStartTime) {
                    this.silenceStartTime = now;
                }

                const silenceElapsed = now - this.silenceStartTime;
                const totalElapsed = this.recordingStartTimestamp ? now - this.recordingStartTimestamp : 0;

                if (silenceElapsed >= this.silenceDurationMs && totalElapsed >= this.minRecordingDurationMs) {
                    this.stopRecording();
                }
            };
        } catch (error) {
            console.warn('Silence detection unavailable', error);
        }
    }

    stopSilenceMonitor() {
        if (this.silenceDetectionRaf) {
            cancelAnimationFrame(this.silenceDetectionRaf);
            this.silenceDetectionRaf = null;
        }

        if (this.audioProcessorNode) {
            try {
                this.audioProcessorNode.disconnect();
            } catch (error) {
                console.warn('Unable to disconnect audio processor', error);
            }
            this.audioProcessorNode.onaudioprocess = null;
            this.audioProcessorNode = null;
        }

        if (this.audioSourceNode) {
            try {
                this.audioSourceNode.disconnect();
            } catch (error) {
                console.warn('Unable to disconnect audio source', error);
            }
            this.audioSourceNode = null;
        }

        this.audioAnalyserNode = null;
        this.audioMonitorData = null;
        this.silenceStartTime = null;
    }

    releaseAudioContext() {
        this.stopSilenceMonitor();
        if (this.audioContext) {
            const ctx = this.audioContext;
            this.audioContext = null;
            ctx.close().catch(() => {});
        }
    }

    hasAnyRecordings() {
        return Array.isArray(this.recordings) && this.recordings.some(recording => !!recording);
    }

    playUserRecordings() {
        if (!this.hasAnyRecordings()) {
            alert('Please record at least one sentence before playing back.');
            return;
        }

        this.stopCurrentUtterance();
        this.abortRecording(true);
        this.playAllMode = false;
        this.isPaused = false;
        this.updatePlayAllButton();

        this.isPlayingUserRecordings = true;
        // Continue from where we stopped, or start from beginning if never played
        const startIndex = this.lastPlayedRecordingIndex >= 0 ? this.lastPlayedRecordingIndex + 1 : -1;
        this.playbackRecordingIndex = startIndex;
        this.updatePlayRecordingsButton();
        this.playNextRecordingSegment(startIndex);
    }

    togglePlayUserRecordings() {
        if (this.isPlayingUserRecordings) {
            this.stopUserRecordings();
            this.updateStatus('Stopped playing your recordings');
        } else {
            this.playUserRecordings();
        }
    }

    stopUserRecordings(updateButton = true) {
        if (this.recordingPlayer) {
            this.recordingPlayer.pause();
            this.recordingPlayer.currentTime = 0;
        }
        // Stop any individual card audio players
        document.querySelectorAll('.recorded-audio').forEach(audio => {
            audio.pause();
            audio.currentTime = 0;
        });
        // Remove playing class from all cards
        document.querySelectorAll('.sentence-card').forEach(card => {
            card.classList.remove('playing');
        });
        this.stopRecordingHighlight();
        this.isPlayingUserRecordings = false;
        // Don't reset lastPlayedRecordingIndex here - keep it for continuation
        this.playbackRecordingIndex = -1;
        if (updateButton) {
            this.updatePlayRecordingsButton();
        }
    }

    playNextRecordingSegment(startIndex) {
        if (!this.isPlayingUserRecordings) {
            return;
        }

        const nextIndex = this.findNextRecordingIndex(typeof startIndex === 'number' ? startIndex : this.playbackRecordingIndex + 1);

        if (nextIndex === null) {
            this.stopUserRecordings();
            this.lastPlayedRecordingIndex = -1; // Reset when finished
            this.updateStatus('Finished playing your recordings');
            return;
        }

        const recording = this.recordings[nextIndex];
        if (!recording) {
            this.playNextRecordingSegment(nextIndex + 1);
            return;
        }

        this.playbackRecordingIndex = nextIndex;
        this.lastPlayedRecordingIndex = nextIndex;
        this.recordingPlayer.src = recording.url;

        // Add playing class and start highlighting
        const card = document.querySelector(`.sentence-card[data-index="${nextIndex}"]`);
        if (card) {
            card.classList.add('playing');
        }
        this.startRecordingHighlight(nextIndex, card, this.recordingPlayer);

        const playPromise = this.recordingPlayer.play();
        if (playPromise && typeof playPromise.then === 'function') {
            playPromise.catch(() => this.handleRecordingPlaybackEnd(true));
        }

        this.updateStatus(`Playing your voice for sentence ${nextIndex + 1}`);
    }

    handleRecordingPlaybackEnd(hasError = false) {
        if (!this.isPlayingUserRecordings) {
            return;
        }

        // Remove playing class and stop highlighting for current card
        const currentCard = document.querySelector(`.sentence-card[data-index="${this.playbackRecordingIndex}"]`);
        if (currentCard) {
            currentCard.classList.remove('playing');
        }
        this.stopRecordingHighlight();

        if (hasError) {
            this.updateStatus('Unable to play recording');
        }

        this.playNextRecordingSegment(this.playbackRecordingIndex + 1);
    }

    findNextRecordingIndex(startIndex) {
        if (!Array.isArray(this.recordings)) {
            return null;
        }

        for (let i = Math.max(0, startIndex); i < this.recordings.length; i++) {
            if (this.recordings[i]) {
                return i;
            }
        }

        return null;
    }

    startRecordingHighlight(index, card, audioElement) {
        // Stop any existing highlighting
        this.stopRecordingHighlight();

        if (!card || !audioElement) {
            return;
        }

        const textDiv = card.querySelector('.text-content');
        if (!textDiv) {
            return;
        }

        const words = textDiv.querySelectorAll('.word');
        if (words.length === 0) {
            return;
        }

        // Wait for audio metadata to get duration
        const setupHighlighting = () => {
            const duration = audioElement.duration;
            if (!duration || isNaN(duration)) {
                // If duration not available, use a simple sequential approach
                const wordDelay = 300; // 300ms per word
                let wordIndex = 0;
                
                this.recordingHighlightInterval = setInterval(() => {
                    if (!this.isPlayingUserRecordings || audioElement.paused || audioElement.ended) {
                        this.stopRecordingHighlight();
                        return;
                    }

                    // Clear previous highlights
                    words.forEach(word => word.classList.remove('highlight'));
                    
                    // Highlight current word
                    if (wordIndex < words.length) {
                        words[wordIndex].classList.add('highlight');
                        wordIndex++;
                    } else {
                        this.stopRecordingHighlight();
                    }
                }, wordDelay);
            } else {
                // Calculate timing based on actual audio duration
                const wordDelay = (duration * 1000) / words.length; // Distribute words evenly across duration
                let wordIndex = 0;
                
                this.recordingHighlightInterval = setInterval(() => {
                    if (!this.isPlayingUserRecordings || audioElement.paused || audioElement.ended) {
                        this.stopRecordingHighlight();
                        return;
                    }

                    // Clear previous highlights
                    words.forEach(word => word.classList.remove('highlight'));
                    
                    // Highlight current word
                    if (wordIndex < words.length) {
                        words[wordIndex].classList.add('highlight');
                        wordIndex++;
                    } else {
                        this.stopRecordingHighlight();
                    }
                }, wordDelay);
            }
        };

        // Try to get duration immediately
        if (audioElement.readyState >= 2) { // HAVE_CURRENT_DATA
            setupHighlighting();
        } else {
            // Wait for loadedmetadata
            const onLoadedMetadata = () => {
                audioElement.removeEventListener('loadedmetadata', onLoadedMetadata);
                setupHighlighting();
            };
            audioElement.addEventListener('loadedmetadata', onLoadedMetadata);
        }
    }

    stopRecordingHighlight() {
        if (this.recordingHighlightInterval) {
            clearInterval(this.recordingHighlightInterval);
            this.recordingHighlightInterval = null;
        }
        // Clear all highlights
        document.querySelectorAll('.word.highlight').forEach(word => {
            word.classList.remove('highlight');
        });
    }

    updatePlayRecordingsButton() {
        const btn = document.getElementById('playRecordingsBtn');
        if (!btn) {
            return;
        }

        if (this.isPlayingUserRecordings) {
            btn.textContent = '⏹';
            btn.title = 'Stop My Voice';
            btn.classList.add('active');
        } else if (this.hasAnyRecordings()) {
            btn.textContent = '🗣️';
            btn.title = 'Play My Voice';
            btn.classList.remove('active');
        } else {
            btn.textContent = '🗣️';
            btn.title = 'Recordings unavailable yet';
            btn.classList.remove('active');
        }
    }

    resetRecordings(length) {
        this.releaseRecordingResources();
        this.recordings = new Array(length).fill(null);
        this.lastPlayedRecordingIndex = -1; // Reset when recordings are reset
        this.updatePlayRecordingsButton();
        this.updateAllMicIcons();
    }

    releaseRecordingResources() {
        if (Array.isArray(this.recordings)) {
            this.recordings.forEach(recording => {
                if (recording && recording.url) {
                    URL.revokeObjectURL(recording.url);
                }
            });
        }
        this.recordings = [];
    }

    releaseMediaStream() {
        this.stopSilenceMonitor();
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }
    }

    togglePlayAll() {
        if (this.sentences.length === 0) {
            alert('Please process some text first');
            return;
        }

        this.stopUserRecordings();

        if (this.playAllMode) {
            // Pause playback
            const pausedSentenceNumber = Math.max(1, this.currentSentenceIndex + 1);
            this.playAllMode = false;
            this.isPaused = true;
            this.stopCurrentUtterance();
            this.abortRecording(true);
            if (this.currentSentenceIndex >= 0) {
                this.currentSentenceIndex -= 1;
            }
            this.updateStatus(`Paused at sentence ${pausedSentenceNumber}`);
        } else if (this.isPaused) {
            // Resume from where we paused
            this.playAllMode = true;
            this.isPaused = false;
            const resumeSentenceNumber = Math.max(1, this.currentSentenceIndex + 2);
            this.updateStatus(`Resumed from sentence ${resumeSentenceNumber}`);
            this.playNextSentence();
        } else {
            // Start playing - continue from last played sentence or start from beginning
            this.playAllMode = true;
            this.isPaused = false;
            this.stopCurrentUtterance();
            this.abortRecording(true);
            
            // If no sentence has been played yet, start from beginning
            if (this.currentSentenceIndex === -1) {
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
         const nextIndex = this.currentSentenceIndex === -1 ? 0 : this.currentSentenceIndex + 1;
 
         if (nextIndex < this.sentences.length) {
             this.currentSentenceIndex = nextIndex;
             const sentence = this.sentences[nextIndex];
             const sentenceCard = document.querySelectorAll('.sentence-card')[nextIndex];

            this.playSentence(sentence, nextIndex, sentenceCard, {
                autoRecordMissing: this.playAllMode && this.microphoneEnabled
            });
         } else {
             this.playAllMode = false;
             this.updatePlayAllButton();
             this.updateStatus('Finished playing all sentences');
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
        this.abortRecording(true);
        this.stopUserRecordings();
        this.playAllMode = false;
        this.isPaused = false;
        this.clearAllHighlights();
        this.updatePlayAllButton();
        this.updateStatus('Stopped');
        
        // Reset to beginning for next play
        this.currentSentenceIndex = -1;
        this.lastPlayedRecordingIndex = -1; // Reset recording playback position
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
        this.releaseRecordingResources();
        this.updatePlayRecordingsButton();
        this.releaseMediaStream();
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

