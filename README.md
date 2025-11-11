# ShadowSpeak

A shadowing practice tool designed to help improve pronunciation and speaking skills through interactive text-to-speech and voice recording features. Perfect for language learners who want to practice speaking by listening to native-like pronunciation and comparing it with their own voice recordings.

## Purpose

ShadowSpeak is designed to help users improve their pronunciation and speaking skills by:

- **Listening**: Hearing text spoken with natural pronunciation using high-quality text-to-speech voices
- **Shadowing**: Practicing speaking by repeating after the audio playback
- **Recording**: Recording your own voice to compare with the native pronunciation
- **Comparing**: Playing back your recordings alongside the original audio to identify areas for improvement

This tool is especially useful for language learners, public speakers, and anyone looking to refine their pronunciation and speaking clarity.

## Features

### Core Features
- **Multi-language Support**: Supports both Arabic (RTL) and English (LTR) text with automatic language detection
- **Text-to-Speech**: Uses Web Speech API for natural voice synthesis with high-quality voices
- **Voice Recording**: Record your voice after each sentence to practice pronunciation
- **Voice Playback**: Listen to your recorded voice to compare with the original audio
- **Word Highlighting**: Real-time word highlighting during playback for better tracking
- **Sentence-by-Sentence Practice**: Practice one sentence at a time for focused learning

### Playback Controls
- **Play All**: Play all sentences sequentially for continuous practice
- **Play Recordings**: Play back only your recorded voice for review
- **Individual Sentence Playback**: Click on any sentence to play it
- **Navigation Controls**: Move to previous or next sentence easily
- **Stop Control**: Stop playback at any time

### Customization
- **Voice Selection**: Choose from available system voices (recommended: Microsoft Edge browser for best voice quality)
- **Speed Control**: Adjustable speech rate (0.5x to 2.0x) for comfortable listening
- **Pitch Control**: Adjustable pitch (0.5x to 2.0x) to match your preference

### Practice Tracking
- **Statistics Dashboard**: Track your progress with real-time statistics
  - Total sentences processed
  - Total words count
  - Practice time tracking
  - Current sentence indicator

### User Experience
- **Microphone Toggle**: Enable/disable automatic voice recording after each sentence
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Modern UI**: Clean, intuitive interface with smooth animations and transitions
- **Accessibility**: Keyboard navigation and semantic HTML for screen readers

### Community & Support
- **Feedback Form**: Share your thoughts, report bugs, or suggest new features
- **Discord Community**: Join our community to connect with other learners
- **Support**: Help keep this free service alive with a donation

## Project Structure

```
ShadowSpeak/
├── index.html              # Main HTML structure
├── assets/
│   ├── styles.css          # All CSS styles and responsive design
│   ├── shadowReader.js     # Core ShadowReader class with all functionality
│   └── main.js             # Application initialization and global functions
└── README.md               # Project documentation
```

## File Descriptions

### `index.html`
- Clean HTML structure without embedded CSS or JavaScript
- Links to external stylesheet and JavaScript files
- Contains all UI elements and controls
- Semantic markup for accessibility
- Footer with community links (Feedback, Discord, Support)

### `assets/styles.css`
- Complete stylesheet with all visual styling
- Responsive design for mobile and desktop
- CSS Grid and Flexbox for layout
- Custom styling for RTL/LTR text direction
- Hover effects and transitions
- Modern glassmorphism design for header cards
- Footer card styling

### `assets/shadowReader.js`
- Main `ShadowReader` class containing all core functionality
- Voice management and selection
- Text processing and sentence splitting
- Speech synthesis and playback controls
- Word highlighting and visual feedback
- Voice recording and playback functionality
- Statistics tracking and timer management
- Microphone permission handling

### `assets/main.js`
- Application initialization
- Global function interface for HTML onclick handlers
- DOM ready event listener
- Clean separation of concerns

## Usage

### Basic Usage

1. Open `index.html` in a modern web browser (recommended: Microsoft Edge for best voice quality)
2. Enter Arabic or English text in the text area
3. Select a voice from the dropdown menu
4. Adjust speed and pitch as needed
5. Click "Process Text" to prepare the text for playback

### Listening and Shadowing

1. Click on individual sentences to play them
2. Use "Play All" to play all sentences sequentially
3. Use navigation controls (Previous/Next) to move between sentences
4. Watch the word highlighting to follow along with the audio

### Recording and Comparing

1. Enable the microphone by toggling "Enable Microphone"
2. Allow microphone permissions when prompted by your browser
3. After each sentence plays, your microphone will automatically start recording
4. Speak the sentence to practice your pronunciation
5. The recording will stop automatically after a pause
6. Click on the recording duration indicator to play back your voice
7. Use "Play My Voice" button to play back all your recordings sequentially
8. Compare your pronunciation with the original audio to identify areas for improvement

### Practice Tips

- Start with slower speeds (0.8x - 1.0x) and gradually increase as you improve
- Record yourself multiple times for the same sentence to track improvement
- Focus on one sentence at a time for better learning outcomes
- Use the statistics panel to track your practice progress
- Practice regularly for best results

## Browser Compatibility

- **Recommended**: Microsoft Edge (best voice quality and performance)
- Modern browsers with Web Speech API support
- Chrome, Firefox, Safari, Edge (latest versions)
- Mobile browsers on iOS and Android
- **Note**: Microphone access requires HTTPS or localhost for security

## Technical Details

- **Web Speech API**: For text-to-speech functionality
- **MediaRecorder API**: For voice recording functionality
- **Vanilla JavaScript**: No external dependencies
- **CSS3**: Modern styling with flexbox and grid
- **Responsive Design**: Mobile-first approach
- **Accessibility**: Semantic HTML and keyboard navigation
- **Local Storage**: (if implemented) for saving preferences

## Development

The project is structured for easy maintenance and extension:

- **Separation of Concerns**: HTML, CSS, and JavaScript are in separate files
- **Modular JavaScript**: Core functionality is encapsulated in the ShadowReader class
- **Clean Code**: Well-commented and organized code structure
- **Extensible**: Easy to add new features or modify existing ones

## Contributing

We welcome contributions! Feel free to:

- Report bugs through the [Feedback Form](https://forms.gle/MyJms2Y4A3pzaFS97)
- Suggest new features
- Join our [Discord Community](https://discord.gg/tcbEqssNUd)
- Support the project with a [donation](https://buymeacoffee.com/tryomar)

## Support

If you find this tool helpful, please consider:

- Sharing it with others who might benefit
- Providing feedback to help us improve
- Supporting the project to keep it free and accessible

## License

This project is open source and available under the MIT License.

## Credits

Made with 🤍 by Omar Abdelrahman
