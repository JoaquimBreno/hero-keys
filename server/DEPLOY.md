# Guia de Deploy no Render - Passo a Passo

## ⚠️ Configuração Importante: Root Directory

Como o projeto está na pasta `server/`, você **DEVE** configurar o Root Directory no Render.

## Passos Detalhados:

### 1. Criar o Web Service no Render

1. Acesse https://dashboard.render.com
2. Clique em **"New +"** → **"Web Service"**
3. Conecte seu repositório Git (GitHub/GitLab/Bitbucket)
4. Selecione o repositório `herokeys`

### 2. Configurar o Root Directory (CRÍTICO)

1. Na página de configuração do serviço, role até **"Settings"**
2. Encontre a seção **"Build & Deploy"**
3. Localize o campo **"Root Directory"**
4. Digite: `server`
5. Isso fará o Render executar todos os comandos a partir da pasta `server/`

### 3. Configurações do Serviço

Após configurar o Root Directory, as seguintes configurações serão aplicadas automaticamente pelo `render.yaml`:

- **Name**: `herokeys-api`
- **Environment**: `Python 3`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `cd src && uvicorn app:app --host 0.0.0.0 --port $PORT`
- **Python Version**: `3.9.18`

### 4. Variáveis de Ambiente (Opcional)

Na seção **"Environment"**, você pode adicionar:

- `ALLOWED_ORIGINS`: Domínios permitidos para CORS (ex: `https://seu-dominio.com,https://www.seu-dominio.com`)

### 5. Deploy

1. Clique em **"Create Web Service"**
2. O Render começará a fazer o build automaticamente
3. Aguarde o deploy completar (pode levar alguns minutos na primeira vez)

## Verificação

Após o deploy, você deve ver:
- ✅ Build completado com sucesso
- ✅ Serviço rodando
- ✅ URL do serviço disponível (ex: `https://herokeys-api.onrender.com`)

## Teste do Deploy

Teste o endpoint de health check:
```bash
curl https://seu-servico.onrender.com/
```

Deve retornar:
```json
{"message": "Hello World"}
```

## Troubleshooting

### Erro: "Module not found"
- ✅ Verifique se o **Root Directory** está configurado como `server`
- ✅ Verifique se o `requirements.txt` está na pasta `server/`

### Erro: "Cannot find app"
- ✅ Verifique se o **Start Command** está correto: `cd src && uvicorn app:app --host 0.0.0.0 --port $PORT`

### Build falha
- ✅ Verifique os logs do build no Render
- ✅ Certifique-se de que todas as dependências estão no `requirements.txt`

## Estrutura Esperada no Render

Após configurar o Root Directory como `server`, o Render verá:

```
/opt/render/project/src/  (pasta src do servidor)
├── app.py
├── utils/
│   └── inference.py
└── temp/
```

Onde `/opt/render/project/` é o diretório raiz que o Render usa após aplicar o Root Directory.

