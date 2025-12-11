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

# Definir PYTHONPATH para incluir o diretório src
ENV PYTHONPATH=/app/src

# Comando para iniciar o servidor (Render usa variável $PORT)
# Executar de dentro de src com PYTHONPATH definido
WORKDIR /app/src
CMD PYTHONPATH=. uvicorn app:app --host 0.0.0.0 --port ${PORT:-8000}

