import os
import base64
import gc
from pathlib import Path
from basic_pitch.inference import predict
from basic_pitch import ICASSP_2022_MODEL_PATH

# Configurar TensorFlow para usar menos memória
def configure_tensorflow_memory():
    """Configura TensorFlow para usar menos memória"""
    try:
        import tensorflow as tf
        import os
        
        # Limitar threads do TensorFlow para reduzir uso de memória
        os.environ['TF_NUM_INTEROP_THREADS'] = '1'
        os.environ['TF_NUM_INTRAOP_THREADS'] = '1'
        
        # Desabilitar alocação de memória completa
        os.environ['TF_FORCE_GPU_ALLOW_GROWTH'] = 'true'
        
        # Limitar crescimento de memória GPU (se disponível)
        gpus = tf.config.experimental.list_physical_devices('GPU')
        if gpus:
            for gpu in gpus:
                tf.config.experimental.set_memory_growth(gpu, True)
        
        # Configurar para usar menos memória na CPU também
        # Limitar uso de memória do TensorFlow
        tf.config.threading.set_inter_op_parallelism_threads(1)
        tf.config.threading.set_intra_op_parallelism_threads(1)
        
    except Exception as e:
        print(f"Warning: Could not configure TensorFlow memory: {e}")

# Configurar na importação
configure_tensorflow_memory()

def run_inference(audio_path):
    """
    Run inference on an audio file to generate MIDI and return as base64
    
    Args:
        audio_path: Path to the audio file
        
    Returns:
        Dictionary with MIDI file path and base64-encoded MIDI content
    """
    try:
        model_output, midi_data, note_events = predict(audio_path)

        # create temp dir (relativo ao diretório atual)
        temp_dir = Path('temp')
        temp_dir.mkdir(exist_ok=True)

        # save midi
        midi_path = temp_dir / 'output.mid'
        midi_data.write(str(midi_path))
        
        # Read the MIDI file and convert to base64
        with open(midi_path, "rb") as f:
            midi_base64 = base64.b64encode(f.read()).decode('utf-8')
        
        # Limpar variáveis grandes da memória
        del model_output
        del note_events
        del midi_data
        
        # Forçar garbage collection
        gc.collect()
        
        return {
            "midi_path": str(midi_path),
            "midi_base64": midi_base64
        }
    except Exception as e:
        # Limpar memória mesmo em caso de erro
        gc.collect()
        raise
