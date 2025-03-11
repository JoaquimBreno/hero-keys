import os
import base64
from basic_pitch.inference import predict
from basic_pitch import ICASSP_2022_MODEL_PATH

def run_inference(audio_path):
    """
    Run inference on an audio file to generate MIDI and return as base64
    
    Args:
        audio_path: Path to the audio file
        
    Returns:
        Dictionary with MIDI file path and base64-encoded MIDI content
    """
    model_output, midi_data, note_events = predict(audio_path)

    # create temp dir
    if not os.path.exists('temp'):
        os.makedirs('temp')

    # save midi
    midi_path = os.path.join('temp', 'output.mid')
    midi_data.write(midi_path)
    
    # Read the MIDI file and convert to base64
    with open(midi_path, "rb") as f:
        midi_base64 = base64.b64encode(f.read()).decode('utf-8')
    
    return {
        "midi_path": midi_path,
        "midi_base64": midi_base64
    }
