import requests
import base64
import os
import json
import sys
import time

def test_midi_base64(audio_file_path):
    """
    Testa a rota de geração de MIDI retornando apenas o MIDI em base64
    
    Args:
        audio_file_path: Caminho para o arquivo de áudio MP3
    """
    start_time = time.time()
    
    # Verifica se o arquivo existe
    if not os.path.exists(audio_file_path):
        print(f"Erro: O arquivo {audio_file_path} não foi encontrado.")
        sys.exit(1)
    
    print(f"Processando arquivo: {os.path.basename(audio_file_path)}")
    
    # Lê o arquivo de áudio
    try:
        with open(audio_file_path, "rb") as audio_file:
            audio_bytes = audio_file.read()
        print(f"Tamanho do arquivo: {len(audio_bytes) / 1024:.2f} KB")
    except Exception as e:
        print(f"Erro ao ler o arquivo de áudio: {e}")
        sys.exit(1)
    
    # Converte para base64
    audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
    print(f"Arquivo convertido para base64")
    
    # Prepara os dados para enviar
    payload = {
        "audioBase64": audio_base64
    }
    
    # URL da API
    url = "http://localhost:8000/generate_midi"
    
    print(f"Enviando para API: {url}")
    
    try:
        # Faz a requisição POST
        response = requests.post(url, json=payload)
        
        # Verifica a resposta
        if response.status_code == 200:
            result = response.json()
            print("Sucesso! MIDI recebido em base64")
            
            # Verifica se o MIDI base64 está na resposta
            if "midi_base64" in result:
                midi_base64 = result["midi_base64"]
                print(f"Tamanho do MIDI em base64: {len(midi_base64) / 1024:.2f} KB")
                
                # Opcional: Salvar o MIDI recebido em um arquivo
                midi_output_path = f"{os.path.splitext(audio_file_path)[0]}_output.mid"
                with open(midi_output_path, "wb") as midi_file:
                    midi_file.write(base64.b64decode(midi_base64))
                print(f"MIDI salvo em: {midi_output_path}")
            else:
                print("Aviso: Nenhum dado MIDI base64 encontrado na resposta")
                print(f"Resposta recebida: {json.dumps(result, indent=2)}")
        else:
            print(f"Erro {response.status_code}: {response.text}")
            try:
                error_data = response.json()
                print(f"Detalhes do erro: {json.dumps(error_data, indent=2)}")
            except:
                pass
    except Exception as e:
        print(f"Erro durante a requisição: {e}")
    
    elapsed_time = time.time() - start_time
    print(f"Tempo total de processamento: {elapsed_time:.2f} segundos")


audio_file_path = '/Users/yvson/Workspace/HeroKeys/SOLTA A CARTA CARAI TIGRINHO FDP  calma vida tô de boa - J.Eskine Piano Tutorial Fácil.mp3'
test_midi_base64(audio_file_path)