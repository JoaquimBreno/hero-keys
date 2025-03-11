# HeroKeys - Audio to MIDI Transcription Platform

HeroKeys is a web application that transcribes audio files into MIDI and visualizes them as piano notes with chord detection. It provides an interactive piano interface to learn and practice songs.

## Features

- Upload audio files (MP3, WAV, etc.)
- Automatic transcription to MIDI using AI
- Piano visualization with falling notes
- Chord detection and display
- Audio playback synchronized with visualization
- MIDI keyboard connectivity
- Interactive piano play-along

## Architecture

The project consists of two main components:

### Server (Python/FastAPI)

- Audio processing and MIDI generation
- Built with FastAPI
- Uses machine learning models for audio transcription
- Provides API endpoints for audio processing

### Web Client (Next.js/React)

- User interface for file upload and visualization
- Interactive piano display
- MIDI device connectivity
- Audio playback controls

## Server Setup

### Requirements

- Python 3.9+
- FastAPI
- Basic-Pitch (for transcription)
- Additional dependencies in `requirements.txt`

## Run the FastAPI server:

**uvicorn** **main:app** **--reload**
