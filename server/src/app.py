from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import base64
import os
from typing import Optional
from pathlib import Path

# Import the inference function
from utils.inference import run_inference

app = FastAPI(
    title="HeroKeys API",
    description="API para geração de MIDI a partir de áudio",
    version="1.0.0"
)

# Enable CORS - Configure para produção
allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configurar diretório temp
TEMP_DIR = Path("temp")
TEMP_DIR.mkdir(exist_ok=True)

class AudioRequest(BaseModel):
    audioBase64: str
    filename: Optional[str] = None

@app.get("/")
def hello_world():
    return {"message": "Hello World"}

def cleanup_temp_files():
    """Limpa arquivos temporários antigos"""
    try:
        for file_path in TEMP_DIR.glob("*"):
            if file_path.is_file():
                file_path.unlink()
    except Exception as e:
        print(f"Erro ao limpar arquivos temporários: {e}")

@app.post("/generate_midi")
def process_audio(request: AudioRequest):
    try:
        # Extract base64 data (remove header if present)
        base64_data = request.audioBase64
        if "base64," in base64_data:
            base64_data = base64_data.split("base64,")[1]
        
        # Decode base64 string to binary data
        audio_data = base64.b64decode(base64_data)
        
        # Use a fixed filename
        file_path = TEMP_DIR / "audio.mp3"
        
        # Write the audio file to disk
        with open(file_path, "wb") as f:
            f.write(audio_data)
        
        # Run inference to generate MIDI and get base64
        result = run_inference(str(file_path))
        
        # Limpar arquivos temporários após processamento
        cleanup_temp_files()
        
        # Retorna apenas o base64 do MIDI
        return {
            "midi_base64": result["midi_base64"]
        }
        
    except Exception as e:
        # Limpar em caso de erro também
        cleanup_temp_files()
        raise HTTPException(status_code=500, detail=f"Error processing audio: {str(e)}")
    