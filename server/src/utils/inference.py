import os
import base64
import librosa
from piano_transcription_inference import PianoTranscription, sample_rate, load_audio
import torch

def run_inference(audio_path):
    """
    Run inference on an audio file to generate MIDI and return as base64
    
    Args:
        audio_path: Path to the audio file
        
    Returns:
        Dictionary with MIDI file path and base64-encoded MIDI content
    """
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    transcriptor = PianoTranscription(device=device, checkpoint_path='models/model_checkpoint.pth')

    audio, _ = librosa.load(path=audio_path, sr=sample_rate, mono=True)

    # create temp dir
    if not os.path.exists('temp'):
        os.makedirs('temp')

    # save midi
    midi_path = os.path.join('temp', 'output.mid')

    # Transcribe and write out to MIDI file
    transcribed_dict = transcriptor.transcribe(audio, midi_path)
    
    # Read the MIDI file and convert to base64
    with open(midi_path, "rb") as f:
        midi_base64 = base64.b64encode(f.read()).decode('utf-8')
    
    return {
        "midi_path": midi_path,
        "midi_base64": midi_base64
    }
