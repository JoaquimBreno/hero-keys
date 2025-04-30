import { NextResponse } from 'next/server';
import Moises from 'moises/sdk';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

const moises = new Moises({ 
  apiKey: process.env.MOISES_API_KEY 
});

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
    await moises.processFile("chords_piano", "temp/piano_output.mp3", "temp");

    // Ler o arquivo piano_output.mp3
    const pianoOutputPath = path.join(tempDir, 'piano_output.mp3');
    const pianoOutputBuffer = fs.readFileSync(pianoOutputPath);
    const pianoOutputBase64 = pianoOutputBuffer.toString('base64');

    // Ler o arquivo Chords.json
    const chordsPath = path.join(tempDir, 'Chords.json');
    let chordsData = {};
    
    if (fs.existsSync(chordsPath)) {
      try {
        const chordsFileContent = fs.readFileSync(chordsPath, 'utf8');
        chordsData = JSON.parse(chordsFileContent);
        console.log('Arquivo de acordes carregado com sucesso');
      } catch (chordsError) {
        console.error('Erro ao ler o arquivo de acordes:', chordsError);
        // Continue mesmo se falhar a leitura dos acordes
      }
    } else {
      console.log('Arquivo de acordes não encontrado:', chordsPath);
    }

    // Enviar o arquivo para a API Python
    const response = await fetch('http://localhost:8000/generate_midi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioBase64: pianoOutputBase64, filename: 'piano_output.mp3' })
    });

    if (!response.ok) {
      throw new Error('Erro ao enviar o arquivo para a API Python');
    }

    // Modificar esta linha para usar a propriedade correta da resposta
    const responseData = await response.json();
    const midiBase64 = responseData.midi_base64; // Usando o nome da propriedade do Python (snake_case)

    console.log('Arquivo processado e salvo com sucesso.');
    
    // Retorna o base64 do MIDI e os dados de acordes
    return NextResponse.json({ 
      midiBase64, 
      chords: chordsData ,
      pianoOutputBuffer: pianoOutputBase64
    }, { status: 200 }); 
    
  } catch (error) {
    console.error('Erro ao processar o arquivo:', error);
    return NextResponse.json({ error: 'Erro ao salvar o arquivo.' }, { status: 500 });
  }
}