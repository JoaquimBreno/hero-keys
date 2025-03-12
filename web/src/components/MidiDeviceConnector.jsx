import React, { useState, useEffect, useRef } from 'react';
import styles from './MidiDeviceConnector.module.css';
import * as Tone from 'tone';
import Soundfont from 'soundfont-player';

export default function MidiDeviceConnector({ 
  isOpen, 
  onClose, 
  onMidiConnect, 
  onMidiMessage,
  isMidiSoundEnabled // Now this represents if MIDI sound volume is > 0
}) {
  const [midiAccess, setMidiAccess] = useState(null);
  const [midiEnable, setMidiEnable] = useState(false);
  const [midiInputs, setMidiInputs] = useState([]);
  const [selectedInput, setSelectedInput] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // 'disconnected', 'connecting', 'connected'
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoadingSound, setIsLoadingSound] = useState(false);
  
  // Refs para manter instrumentos e notas
  const soundfontPlayerRef = useRef(null);
  const activeNotesRef = useRef({});
  const audioContextRef = useRef(null);
  // Add a ref to track current midiEnable value to avoid closure issues
  const midiEnableRef = useRef(false);
  
  useEffect(() => {
    setMidiEnable(isMidiSoundEnabled);
    midiEnableRef.current = isMidiSoundEnabled;
  },[isMidiSoundEnabled]);
  // Inicializa o AudioContext e carrega o instrumento assim que o componente montar
  useEffect(() => {
    // Criar AudioContext se não existir independentemente se o modal está aberto
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    // Só carregue o soundfont se não estiver carregado ou se foi explicitamente desconectado
    if ((!soundfontPlayerRef.current && isOpen) || (connectionStatus === 'disconnected' && isOpen)) {
      // Verificar se o AudioContext está suspenso e tentar resumir
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(err => {
          console.error('Failed to resume AudioContext:', err);
        });
      }
      
      // Carregar o piano de cauda
      loadSoundfont();
    }
    
    // Apenas limpe recursos quando o componente for desmontado completamente
    // não quando o modal for fechado
    return () => {
      // Não limpe os recursos enquanto estiver conectado
      if (connectionStatus === 'disconnected') {
        if (soundfontPlayerRef.current) {
          soundfontPlayerRef.current.stop();
          soundfontPlayerRef.current = null;
        }
        activeNotesRef.current = {};
      }
    };
  }, [isOpen, connectionStatus]);
  
  // Função para carregar o piano usando soundfont-player
  const loadSoundfont = async () => {
    if (!audioContextRef.current) return;
    
    try {
      setIsLoadingSound(true);
      
      // Verificar e resumir o contexto de áudio se necessário
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      // Usar a biblioteca FluidR3_GM que é mais confiável
      const player = await Soundfont.instrument(audioContextRef.current, 'acoustic_grand_piano', {
        soundfont: 'FluidR3_GM',
        format: 'mp3',
        // URL direta para o arquivo JS do instrumento
        url: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/'
      });
      
      soundfontPlayerRef.current = player;
      
      // Tocar uma nota de teste para verificar o som
      setTimeout(() => {
        try {
          player.play('C4', 0, { duration: 0.5, gain: 0.5 });
        } catch (error) {
          console.error('Erro ao tentar tocar nota de teste:', error);
        }
      }, 500);
      
      setIsLoadingSound(false);
    } catch (error) {
      console.error('Erro ao carregar instrumento:', error);
      setErrorMessage(`Erro ao carregar o som do piano: ${error.message}`);
      setIsLoadingSound(false);
    }
  };

  // Check if Web MIDI is supported and auto-connect when opened
  useEffect(() => {
    if (!isOpen) return;
    setErrorMessage('');
    
    if (!navigator.requestMIDIAccess) {
      setErrorMessage('O seu navegador não suporta Web MIDI API. Por favor, tente usar o Chrome ou Edge.');
      return;
    }
    
    // Auto iniciar o processo de conexão quando o modal é aberto automaticamente
    setConnectionStatus('connecting');
    handleConnectMidi();
  }, [isOpen]);

  // Connect to MIDI when user confirms
  const handleConnectMidi = async () => {
    try {
      const access = await navigator.requestMIDIAccess();
      setMidiAccess(access);
      
      // Get all available MIDI inputs
      const inputs = [];
      access.inputs.forEach(input => {
        inputs.push({
          id: input.id,
          name: input.name || `MIDI Input ${inputs.length + 1}`,
          device: input
        });
      });
      
      setMidiInputs(inputs);
      
      if (inputs.length === 0) {
        setErrorMessage('Nenhum dispositivo MIDI encontrado. Conecte um teclado MIDI e tente novamente.');
        setConnectionStatus('disconnected');
      } else if (inputs.length === 1) {
        // If only one device is found, select it automatically
        connectToInput(inputs[0]);
      } else {
        // Multiple devices found, let user choose
        setConnectionStatus('selecting');
      }
    } catch (error) {
      console.error('Failed to access MIDI devices:', error);
      setErrorMessage(`Erro ao acessar dispositivos MIDI: ${error.message}`);
      setConnectionStatus('disconnected');
    }
  };

  // Connect to a specific input device
  const connectToInput = (input) => {
    if (!input || !input.device) return;
    
    // Garantir que o contexto de áudio esteja ativo após interação do usuário
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    
    // Remove any previous listeners
    midiInputs.forEach(input => {
      input.device.onmidimessage = null;
    });
    
    // Set up the message handler for this input
    input.device.onmidimessage = handleMidiMessage;
    setSelectedInput(input);
    setConnectionStatus('connected');
    
    // Tocar uma nota de confirmação para verificar o áudio
    if (soundfontPlayerRef.current) {
      setTimeout(() => {
        try {
          soundfontPlayerRef.current.play('G4', 0, { duration: 0.3, gain: 0.7 });
          soundfontPlayerRef.current.play('C5', 0.3, { duration: 0.3, gain: 0.7 });
        } catch (error) {
          console.error('Erro ao tocar notas de confirmação:', error);
        }
      }, 300);
    }
    
    if (onMidiConnect) {
      setMidiEnable(true);
      // Update the ref to reflect the new state
      midiEnableRef.current = true;
      onMidiConnect(true, input.name);
    }
  };

  // Handle incoming MIDI messages
  const handleMidiMessage = (event) => {
    // MIDI message format: [status/command, data1, data2]
    const status = event.data[0];
    
    // Extract command and channel properly
    const command = (status >= 128 && status <= 239) ? ((status >> 4) & 0xF) : status;
    const channel = (status >= 128 && status <= 239) ? (status & 0xF) : 0;
    
    const noteNumber = event.data.length > 1 ? event.data[1] : 0;
    const velocity = event.data.length > 2 ? event.data[2] : 0;

    // Determine the type more accurately:
    let type = command;
    
    // Simplify to note on/off for callback
    if (command === 9 && velocity > 0) {
      type = 9; // Note On
    } else if (command === 8 || (command === 9 && velocity === 0)) {
      type = 8; // Note Off
    }

    // Format event to match expected format
    const formattedEvent = {
      type: type,
      channel: channel,
      data: [noteNumber, velocity]
    };
    
    // Use SoundFont player to play notes only if sound is enabled - use ref instead of state
    if (soundfontPlayerRef.current && midiEnableRef.current) {
      try {
        // Verificar e resumir o contexto de áudio antes de tocar
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume();
        }
        
        // Convert MIDI note number to note name (e.g., 60 = "C4")
        const noteName = Tone.Frequency(noteNumber, "midi").toNote();
        
        if (type === 9) { // Note On
          // Normalize velocity (0-127) to (0-1)
          const normalizedVelocity = velocity / 127;
          
          // Apply sensitivity curve for better dynamics
          const enhancedVelocity = Math.min(Math.sqrt(normalizedVelocity) * 1.7, 1.0);
          
          // Stop previous note if it's still playing (for same note)
          if (activeNotesRef.current[noteName]) {
            activeNotesRef.current[noteName].stop();
          }
          
          // Play the note with explicit options
          activeNotesRef.current[noteName] = soundfontPlayerRef.current.play(
            noteName, 
            0, // Start immediately
            { 
              gain: enhancedVelocity,
              duration: 2.5, // Duração longa o suficiente para sustentar a nota
              adsr: [0.01, 0.1, 0.7, 0.5] // Ataque rápido, decay curto, sustain médio, release médio
            }
          );
        } else if (type === 8) { // Note Off
          // Stop the note if it's playing
          if (activeNotesRef.current[noteName]) {
            activeNotesRef.current[noteName].stop();
            delete activeNotesRef.current[noteName];
          }
        }
      } catch (error) {
        console.error('Erro ao processar mensagem MIDI:', error);
      }
    }

    // Always pass the event to the callback, even if sound is disabled
    if (onMidiMessage) {
      onMidiMessage(formattedEvent);
    }
  };

  // Disconnect from MIDI - este método deve ser chamado explicitamente pelo usuário
  const handleDisconnect = () => {
    if (selectedInput && selectedInput.device) {
      selectedInput.device.onmidimessage = null;
    }
    setSelectedInput(null);
    setConnectionStatus('disconnected');
    
    // Stop all playing notes
    if (soundfontPlayerRef.current) {
      soundfontPlayerRef.current.stop();
      // NÃO destrua o player aqui, apenas pare as notas
      // soundfontPlayerRef.current = null;
    }
    activeNotesRef.current = {};
    
    if (onMidiConnect) {
      setMidiEnable(false);
      // Update the ref to match the state
      midiEnableRef.current = false;
      onMidiConnect(false);
    }
  };

  // Função para testar o áudio manualmente
  const testAudio = () => {
    if (soundfontPlayerRef.current && audioContextRef.current) {
      // Garantir que o contexto está ativo
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      
      // Tocar uma sequência de notas para teste
      const notes = ['C4', 'E4', 'G4', 'C5'];
      notes.forEach((note, index) => {
        setTimeout(() => {
          soundfontPlayerRef.current.play(note, 0, { duration: 0.5, gain: 0.7 });
        }, index * 200);
      });
    } else {
      console.warn('Player não está disponível para teste');
      setErrorMessage('Não foi possível testar o áudio. Tente reconectar.');
    }
  };

  // Adicionar manipulador para o fechamento do modal
  const handleModalClose = () => {
    // Não desconecte o dispositivo MIDI ao fechar o modal
    // Apenas notifique o componente pai que o modal foi fechado
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <button className={styles.closeButton} onClick={handleModalClose}>×</button>
        
        <h2>Conectar Teclado MIDI</h2>
        
        {connectionStatus === 'disconnected' && !errorMessage && (
          <div className={styles.content}>
            <p>Deseja conectar um dispositivo MIDI (teclado) para tocar interativamente?</p>
            <div className={styles.buttons}>
              <button 
                className={`${styles.button} ${styles.primaryButton}`}
                onClick={handleConnectMidi}
              >
                Conectar Teclado
              </button>
              <button 
                className={styles.button}
                onClick={onClose}
              >
                Não, obrigado
              </button>
            </div>
          </div>
        )}
        
        {connectionStatus === 'connecting' && (
          <div className={styles.content}>
            <p>Solicitando acesso aos dispositivos MIDI...</p>
            <div className={styles.spinner}></div>
          </div>
        )}
        
        {connectionStatus === 'selecting' && (
          <div className={styles.content}>
            <p>Selecione um dispositivo MIDI:</p>
            <ul className={styles.deviceList}>
              {midiInputs.map(input => (
                <li key={input.id}>
                  <button 
                    className={styles.deviceButton}
                    onClick={() => connectToInput(input)}
                  >
                    {input.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {connectionStatus === 'connected' && (
          <div className={styles.content}>
            <p>Conectado ao dispositivo: <strong>{selectedInput?.name}</strong></p>
            
            {isLoadingSound && (
              <div className={styles.loadingState}>
                <p>Carregando sons do piano...</p>
                <div className={styles.spinner}></div>
              </div>
            )}
            
            <p className={styles.successMessage}>
              Seu teclado agora está conectado com som de piano. Toque algumas teclas!
            </p>
            
            {/* Botão para testar o som */}
            <div className={styles.audioTestSection}>
              <p>Não está ouvindo som? Clique para testar:</p>
              <button 
                className={`${styles.button} ${styles.testButton}`}
                onClick={testAudio}
              >
                Testar Áudio
              </button>
            </div>
            
            <div className={styles.buttons}>
              <button 
                className={`${styles.button} ${styles.dangerButton}`}
                onClick={handleDisconnect}
              >
                Desconectar
              </button>
              <button 
                className={styles.button}
                onClick={handleModalClose}
              >
                Fechar
              </button>
            </div>
          </div>
        )}
        
        {errorMessage && (
          <div className={styles.content}>
            <p className={styles.errorMessage}>{errorMessage}</p>
            <div className={styles.buttons}>
              <button 
                className={styles.button}
                onClick={onClose}
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
