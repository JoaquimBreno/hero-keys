# Como Usar o MIDIParser-JS com Node.js

Para usar o `midi-parser-js` para analisar um arquivo MIDI local com Node.js, você precisa seguir estes passos:

## 1. Instalação das Dependências

Primeiro, instale as dependências necessárias:

```bash
npm install midi-parser-js fs
```

## 2. Código JavaScript para Analisar um Arquivo MIDI

Crie um arquivo (por exemplo, `parse-midi.js`) com o seguinte conteúdo:

```javascript
const fs = require('fs');
const MIDIParser = require('midi-parser-js');

// Configurar o MIDIParser para Node.js
MIDIParser.parse = function(file, callback) {
    // Lê o arquivo MIDI como buffer
    const buffer = fs.readFileSync(file);
  
    // Converte o buffer para um array de bytes
    const byteArray = new Uint8Array(buffer);
  
    // Faz o parsing do MIDI
    const midiObject = MIDIParser.Uint8(byteArray);
  
    // Chama o callback com o resultado
    callback(midiObject);
};

// Caminho para o arquivo MIDI
const midiFilePath = './caminho/para/seu/arquivo.mid';

// Fazer o parsing do arquivo MIDI
MIDIParser.parse(midiFilePath, function(midiData) {
    console.log('MIDI Data:', JSON.stringify(midiData, null, 2));
  
    // Aqui você pode processar os dados MIDI como necessário
    // Por exemplo, acessar as faixas (tracks)
    if (midiData.track) {
        console.log(`Número de faixas: ${midiData.track.length}`);
      
        // Exemplo: mostrar eventos da primeira faixa
        if (midiData.track.length > 0) {
            console.log('Eventos da primeira faixa:', midiData.track[0].event.length);
        }
    }
});
```

## 3. Executando o Código

Execute o código com Node.js:

```bash
node parse-midi.js
```

## Observações Importantes

1. Substitua `'./caminho/para/seu/arquivo.mid'` pelo caminho real para o seu arquivo MIDI.
2. O objeto MIDI retornado pelo parser terá uma estrutura semelhante a esta:

   ```javascript
   {
     "formatType": 1,
     "trackCount": 2,
     "ticksPerBeat": 480,
     "track": [
       {
         "event": [
           { /* evento MIDI */ },
           // mais eventos...
         ]
       },
       // mais faixas...
     ]
   }
   ```
3. Cada evento MIDI contém informações como tipo de evento, delta time, etc.
4. Se você encontrar problemas com o `midi-parser-js`, considere alternativas como `midi-file` ou `midifile`.

Este código deve permitir que você carregue e analise arquivos MIDI locais usando Node.js.
