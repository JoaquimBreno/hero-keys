# HeroKeys API Server

API FastAPI para geração de MIDI a partir de arquivos de áudio.

## Deploy no Render

### Pré-requisitos
- Conta no Render.com
- Repositório Git configurado

### Passos para Deploy

1. **Conectar Repositório no Render**
   - Acesse https://render.com
   - Crie um novo Web Service
   - Conecte seu repositório Git

2. **Configurar Diretório Raiz (IMPORTANTE)**
   - Nas configurações do serviço, vá em **Settings**
   - Encontre a opção **Root Directory**
   - Defina como: `server`
   - Isso fará o Render usar a pasta `server` como diretório raiz do projeto

3. **Configurações no Render**
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `cd src && uvicorn app:app --host 0.0.0.0 --port $PORT`
   - **Environment**: Python 3
   - **Python Version**: 3.9.18
   - **Root Directory**: `server` ⚠️ **IMPORTANTE: Configure isso!**

3. **Variáveis de Ambiente**
   - `ALLOWED_ORIGINS`: Domínios permitidos para CORS (separados por vírgula)
   - `PORT`: Porta do servidor (geralmente definida automaticamente pelo Render)

4. **Deploy**
   - O Render detectará automaticamente o `render.yaml` se presente
   - Ou configure manualmente usando as configurações acima

### Estrutura do Projeto

```
server/
├── src/
│   ├── app.py              # Aplicação FastAPI principal
│   └── utils/
│       └── inference.py     # Função de inferência
├── requirements.txt         # Dependências Python
├── Dockerfile              # Para deploy via Docker (opcional)
└── render.yaml             # Configuração do Render
```

### Endpoints

- `GET /`: Health check
- `POST /generate_midi`: Gera MIDI a partir de áudio em base64

### Exemplo de Uso

```python
import requests
import base64

# Ler arquivo de áudio
with open("audio.mp3", "rb") as f:
    audio_base64 = base64.b64encode(f.read()).decode()

# Enviar para API
response = requests.post(
    "https://your-api.onrender.com/generate_midi",
    json={"audioBase64": audio_base64}
)

midi_base64 = response.json()["midi_base64"]
```

### Notas Importantes

- O servidor limpa automaticamente arquivos temporários após cada processamento
- Certifique-se de que o modelo necessário está disponível no servidor
- Para produção, configure `ALLOWED_ORIGINS` com os domínios específicos do seu frontend