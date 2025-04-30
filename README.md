# HeroKeys 🎹 - Advanced MIDI Piano Visualizer

HeroKeys is a professional MIDI piano visualization tool for refined musical performances, offering real-time note visualization, sheet music display, and audio-to-MIDI conversion capabilities. Think of it as **Guitar Hero for piano** - a "Piano Hero" experience that makes learning and performing piano more engaging and interactive.

[![Piano Visualization](https://img.shields.io/badge/Piano-Visualization-blue)](https://herokeys.com)
[![MIDI Processing](https://img.shields.io/badge/MIDI-Processing-green)](https://herokeys.com)
[![Audio Transcription](https://img.shields.io/badge/Audio-Transcription-red)](https://herokeys.com)

## Overview

HeroKeys transforms how musicians and music enthusiasts interact with MIDI data through:
- Elegant neon-style piano visualizations for MIDI files with falling notes like in rhythm games
- Advanced audio-to-MIDI processing with professional-grade transcription
- Real-time sheet music and chord progression display
- Interactive gameplay-like experience for learning and playing piano
- External MIDI device connectivity for live performances

## Project Structure

The project consists of two main components:

1. **Next.js Web Application** - Modern React/Next.js app with sophisticated UI
2. **Python Backend Server** - FastAPI server for audio processing and MIDI conversion
3. **Legacy Component** - Standalone version of the visualizer for compatibility

### Technologies

#### Frontend
- React/Next.js for UI components and state management
- Tone.js for MIDI processing and playback
- Tailwind CSS for responsive styling
- SoundFont Player for high-quality instrument sounds
- Web MIDI API for hardware MIDI device connections

#### Backend
- FastAPI/Uvicorn for high-performance API server
- Moises API integration for professional audio analysis
- Google Cloud Storage for optional file management
- Web Audio API for browser-based audio processing
- Basic Pitch for neural network audio transcription

## Key Features

- 🎹 Interactive virtual piano with realistic keyboard response
- 🎵 Stunning waterfall note visualization with customizable effects
- 🎼 Professional sheet music display with dynamic following
- 🎧 Advanced audio playback controls with time synchronization
- 🔄 Neural network-powered audio-to-MIDI conversion
- 🎮 Modern, responsive UI for desktop and mobile devices
- ✨ Customizable visual effects and themes
- 🎛️ External MIDI device support for live performances

## Installation

### Requirements
- Node.js 18.0 or higher
- Python 3.9 or higher
- NPM or Yarn
- pip

### Web Application Setup

```bash
# Navigate to web directory
cd web

# Install dependencies
npm install

# Start development server
npm run dev
```

Access the application at [http://localhost:3000](http://localhost:3000)

### Backend Server Setup

```bash
# Navigate to server directory
cd server

# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the server with uvicorn
uvicorn src.app:app --reload
```

The API server will run at [http://localhost:8000](http://localhost:8000)

### Environment Variables

Create a `.env` file in both the web and server directories with the following variables:

#### Web
```
NEXT_PUBLIC_API_URL=http://localhost:8000
MOISES_API_KEY=your_api_key
GOOGLE_CLOUD_STORAGE_BUCKET=your_bucket (optional)
```

#### Server
```
MOISES_API_KEY=your_api_key
STORAGE_BUCKET=your_bucket (optional)
DEBUG=True
```

## Usage

1. Upload or drag & drop an audio or MIDI file into the interface
2. For audio files, the backend server will process and convert to MIDI notation
3. View the piano visualization with flowing notes
4. Use playback controls to pause, rewind, or fast-forward
5. Toggle additional features like chord visualization and sheet music display

## Development

### File Structure

```
herokeys/
  ├── web/                  # Next.js frontend application
  │   ├── src/
  │   │   ├── app/          # Next.js pages and routes
  │   │   │   └── api/
  │   │   │       └── processAudio/ # API route for audio processing
  │   │   ├── components/   # Reusable React components
  │   │   ├── lib/          # Libraries and utilities
  │   │   ├── utils/        # Helper functions
  │   │   └── assets/       # Static resources
  │   ├── public/           # Public files
  │   └── package.json      # Dependencies and scripts
  │
  └── server/               # FastAPI backend server
      ├── src/
      │   ├── app.py        # Server entry point
      │   ├── utils/        # Utility functions including inference
      │   └── models/       # Data models
      └── requirements.txt  # Python dependencies
```

## API Endpoints

The API includes the following endpoints:

### Next.js API Routes:
- `POST /api/processAudio` - Processes audio files with Moises API for piano separation and chord detection, then forwards to the Python backend

### FastAPI Backend:
- `GET /` - Simple health check endpoint
- `POST /generate_midi` - Converts audio file to MIDI using inference tools

The main workflow involves the frontend sending audio to the Next.js API route, which processes it with Moises API and then forwards to the FastAPI backend for MIDI generation.

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Credits

Developed by Moises Inc.

## Keywords

piano visualization, MIDI player, sheet music generator, audio to MIDI converter, music transcription tool, piano roll editor, music education software, digital piano visualizer, MIDI keyboard visualization, neural network transcription 