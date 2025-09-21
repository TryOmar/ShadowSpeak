/**
 * Main application entry point and global functions
 * Handles app initialization and provides global function interface
 */

let shadowReader;

/**
 * Initialize the application when DOM is loaded
 */
function initApp() {
    shadowReader = new ShadowReader();
}

/**
 * Process the input text and prepare for playback
 */
function processText() {
    shadowReader.processText();
}

/**
 * Toggle play all mode (play/pause/resume)
 */
function togglePlayAll() {
    shadowReader.togglePlayAll();
}

/**
 * Stop all playback and reset state
 */
function stopAll() {
    shadowReader.stopAll();
}

/**
 * Play the next sentence
 */
function nextSentence() {
    shadowReader.nextSentence();
}

/**
 * Play the previous sentence
 */
function previousSentence() {
    shadowReader.previousSentence();
}

/**
 * Clear all text and reset the application
 */
function clearText() {
    shadowReader.clearText();
}

// Initialize the app when DOM is fully loaded
document.addEventListener('DOMContentLoaded', initApp);
