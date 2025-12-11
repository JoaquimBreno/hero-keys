FROM python:3.9-slim

WORKDIR /app

# Instalar dependências do sistema necessárias
RUN apt-get update && apt-get install -y \
    build-essential \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements primeiro para aproveitar o cache do Docker
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar o código do servidor
COPY src/ ./src/

# Criar diretório para arquivos temporários
RUN mkdir -p src/temp

# Expor a porta que o FastAPI usará
EXPOSE 8000

# Comando para iniciar o servidor (Render usa variável $PORT)
CMD uvicorn src.app:app --host 0.0.0.0 --port ${PORT:-8000}

