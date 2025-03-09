// FILE: app/api/processAudio/route.js
import { NextResponse } from 'next/server';
import Moises from 'moises/sdk';
import fs from 'fs';
import path from 'path';

const moises = new Moises({ apiKey: "" });

export async function POST(request) {
  console.log('processAudio API called');
  try {
    const { audioBase64 } = await request.json();
    
    if (!audioBase64) {
      return NextResponse.json({ error: 'Parâmetro audioBase64 é obrigatório.' }, { status: 400 });
    }

    // Remove header se existir (ex: data:audio/mp3;base64,...)
    const regex = /^data:([A-Za-z-+\/]+);base64,(.+)$/;
    let base64Data = audioBase64;
    const matches = audioBase64.match(regex);

    if (matches) {
      base64Data = matches[2]; // Usa somente a string base64
    }
    
    // Converte a string base64 para buffer
    const buffer = Buffer.from(base64Data, 'base64');

    // Define o diretório temp e cria-o se não existir
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Define o nome do arquivo com extensão .mp3
    const fileName = `song.mp3`;
    const filePath = path.join(tempDir, fileName);

    // Salva o arquivo mp3
    fs.writeFileSync(filePath, buffer);

    // Processa o arquivo com a API Moises
    await moises.processFile("piano_separation", "temp/song.mp3", "temp");

    console.log('Arquivo processado e salvo com sucesso.');
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Erro ao processar o arquivo:', error);
    return NextResponse.json({ error: 'Erro ao salvar o arquivo.' }, { status: 500 });
  }
}