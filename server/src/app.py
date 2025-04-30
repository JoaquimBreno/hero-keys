from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import base64
import os
from typing import Optional

# Import the inference function
from utils.inference import run_inference

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AudioRequest(BaseModel):
    audioBase64: str
    filename: Optional[str] = None

@app.get("/")
def hello_world():
    return {"message": "Hello World"}

@app.post("/generate_midi")
def process_audio(request: AudioRequest):
    try:
        # Extract base64 data (remove header if present)
        base64_data = request.audioBase64
        if "base64," in base64_data:
            base64_data = base64_data.split("base64,")[1]
        
        # Decode base64 string to binary data
        audio_data = base64.b64decode(base64_data)
        
        # Create temp directory if it doesn't exist
        if not os.path.exists("temp"):
            os.makedirs("temp")
        
        # Use a fixed filename
        file_path = os.path.join("temp", "audio.mp3")
        
        # Write the audio file to disk
        with open(file_path, "wb") as f:
            f.write(audio_data)
        
        # Run inference to generate MIDI and get base64
        result = run_inference(file_path)
        
        # Retorna apenas o base64 do MIDI
        return {
            "midi_base64": result["midi_base64"]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing audio: {str(e)}")
    