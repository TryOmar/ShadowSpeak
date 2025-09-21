# ShadowSpeak

A reading practice tool that provides text-to-speech functionality with word highlighting for Arabic and English text.

## Features

- **Multi-language Support**: Supports both Arabic (RTL) and English (LTR) text
- **Text-to-Speech**: Uses Web Speech API for natural voice synthesis
- **Word Highlighting**: Real-time word highlighting during playback
- **Playback Controls**: Play individual sentences or all text at once
- **Voice Selection**: Choose from available system voices
- **Speed & Pitch Control**: Adjustable speech rate and pitch
- **Practice Statistics**: Track sentences, words, and practice time
- **Responsive Design**: Works on desktop and mobile devices

## Project Structure

```
ShadowSpeak/
├── index.html          # Main HTML structure
├── styles.css          # All CSS styles and responsive design
├── js/
│   ├── shadowReader.js # Core ShadowReader class with all functionality
│   └── main.js         # Application initialization and global functions
└── README.md           # Project documentation
```

## File Descriptions

### `index.html`
- Clean HTML structure without embedded CSS or JavaScript
- Links to external stylesheet and JavaScript files
- Contains all UI elements and controls
- Semantic markup for accessibility

### `styles.css`
- Complete stylesheet with all visual styling
- Responsive design for mobile and desktop
- CSS Grid and Flexbox for layout
- Custom styling for RTL/LTR text direction
- Hover effects and transitions

### `js/shadowReader.js`
- Main `ShadowReader` class containing all core functionality
- Voice management and selection
- Text processing and sentence splitting
- Speech synthesis and playback controls
- Word highlighting and visual feedback
- Statistics tracking and timer management

### `js/main.js`
- Application initialization
- Global function interface for HTML onclick handlers
- DOM ready event listener
- Clean separation of concerns

## Usage

1. Open `index.html` in a modern web browser
2. Enter Arabic or English text in the text area
3. Select a voice from the dropdown
4. Adjust speed and pitch as needed
5. Click "Process Text" to prepare the text for playback
6. Click on individual sentences to play them
7. Use "Play All" to play all sentences sequentially
8. Use navigation controls to move between sentences

## Browser Compatibility

- Modern browsers with Web Speech API support
- Chrome, Firefox, Safari, Edge (latest versions)
- Mobile browsers on iOS and Android

## Technical Details

- **Web Speech API**: For text-to-speech functionality
- **Vanilla JavaScript**: No external dependencies
- **CSS3**: Modern styling with flexbox and grid
- **Responsive Design**: Mobile-first approach
- **Accessibility**: Semantic HTML and keyboard navigation

## Development

The project is structured for easy maintenance and extension:

- **Separation of Concerns**: HTML, CSS, and JavaScript are in separate files
- **Modular JavaScript**: Core functionality is encapsulated in the ShadowReader class
- **Clean Code**: Well-commented and organized code structure
- **Extensible**: Easy to add new features or modify existing ones

## License

This project is open source and available under the MIT License.
