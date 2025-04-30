function simplifyMIDIData(midiFile) {
    // Cria uma cópia profunda do arquivo MIDI original
    const simplifiedMidiFile = JSON.parse(JSON.stringify(midiFile));

    // Processar cada track
    simplifiedMidiFile.tracks = simplifiedMidiFile.tracks.map(track => {
        // Filtrar e processar eventos
        const filteredEvents = track.events
            .filter(event => 
                // Filtrar apenas notas de piano (canal 0) nas oitavas 2-6
                event.type === 'note' && 
                event.channel === 0 && 
                event.noteNumber >= 36 && // C2 (oitava 2)
                event.noteNumber <= 84   // C6 (oitava 6)
            );

        // Simplificar notas
        const simplifiedEvents = simplifyNotes(filteredEvents);

        // Substituir eventos originais pelos simplificados
        track.events = simplifiedEvents;

        return track;
    });

    return simplifiedMidiFile;
}

function simplifyNotes(events) {
    // Ordenar eventos por tempo de início
    const sortedEvents = events.sort((a, b) => a.startTime - b.startTime);

    const simplifiedEvents = [];
    let currentEvent = null;

    for (const event of sortedEvents) {
        if (!currentEvent) {
            currentEvent = { ...event };
            continue;
        }

        // Verificar se as notas estão muito próximas (dentro de 50ms)
        if (event.startTime - currentEvent.endTime < 50) {
            // Mesclar eventos
            currentEvent.endTime = Math.max(currentEvent.endTime, event.endTime);
            
            // Combinar velocidades (pode ser ajustado conforme necessário)
            currentEvent.velocity = Math.max(currentEvent.velocity, event.velocity);
            
            // Opcionalmente, ajustar outras propriedades
            currentEvent.duration = currentEvent.endTime - currentEvent.startTime;
        } else {
            // Adicionar evento anterior e começar novo
            simplifiedEvents.push(currentEvent);
            currentEvent = { ...event };
        }
    }

    // Adicionar último evento
    if (currentEvent) {
        simplifiedEvents.push(currentEvent);
    }

    return simplifiedEvents;
}

// Função de processamento principal
export function processMIDIFile(midiFile) {
    try {
        // Simplificar o arquivo MIDI
        const simplifiedMidiFile = simplifyMIDIData(midiFile);
        
        return simplifiedMidiFile;
    } catch (error) {
        console.error('Erro ao processar arquivo MIDI:', error);
        return midiFile; // Retorna o arquivo original em caso de erro
    }
}
