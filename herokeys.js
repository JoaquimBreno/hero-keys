// PianoViz - Uma biblioteca para visualização MIDI de piano com efeitos neon
// Inspirado no design Apple com tema escuro e detalhes neon azul

class PianoViz {
    constructor(containerId, options = {}) {
      // Configurações padrão
      this.config = {
        width: options.width || window.innerWidth,
        height: options.height || 400,
        keyboardHeight: options.keyboardHeight || 120,
        backgroundColor: options.backgroundColor || '#121212',
        whiteKeyColor: options.whiteKeyColor || '#f5f5f7',
        blackKeyColor: options.blackKeyColor || '#1d1d1f',
        activeKeyColor: options.activeKeyColor || '#0084ff',
        glowColor: options.glowColor || 'rgba(0, 132, 255, 0.7)',
        glowSize: options.glowSize || 15,
        fallSpeed: options.fallSpeed || 2,
        noteWidth: options.noteWidth || 0,
        startOctave: options.startOctave || 2,
        endOctave: options.endOctave || 6,
        fadeOutTime: options.fadeOutTime || 1000,
        glowIntensity: options.glowIntensity || 0.8,
        particleEffect: options.particleEffect !== undefined ? options.particleEffect : true,
        reflectionEffect: options.reflectionEffect !== undefined ? options.reflectionEffect : true,
      };
      
      this.container = document.getElementById(containerId);
      if (!this.container) {
        throw new Error(`Container with ID "${containerId}" not found`);
      }
      
      this.notes = [];
      this.activeNotes = {};
      this.particles = [];
      this.playerStatus = 'stopped';
      
      this.init();
    }
    
    init() {
      // Configurar o container
      this.container.style.position = 'relative';
      this.container.style.overflow = 'hidden';
      this.container.style.backgroundColor = this.config.backgroundColor;
      this.container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
      this.container.style.borderRadius = '12px';
      this.container.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.5)';
      
      // Criar canvas principal
      this.canvas = document.createElement('canvas');
      this.canvas.width = this.config.width;
      this.canvas.height = this.config.height;
      this.canvas.style.position = 'absolute';
      this.canvas.style.top = '0';
      this.canvas.style.left = '0';
      this.container.appendChild(this.canvas);
      this.ctx = this.canvas.getContext('2d');
      
      // Criar canvas para reflexos
      this.reflectionCanvas = document.createElement('canvas');
      this.reflectionCanvas.width = this.config.width;
      this.reflectionCanvas.height = this.config.height;
      this.reflectionCanvas.style.position = 'absolute';
      this.reflectionCanvas.style.top = '0';
      this.reflectionCanvas.style.left = '0';
      this.reflectionCanvas.style.opacity = '0.3';
      this.container.appendChild(this.reflectionCanvas);
      this.reflectionCtx = this.reflectionCanvas.getContext('2d');
      
      // Configurar teclado
      this.setupKeyboard();
      
      // Iniciar animação
      this.lastFrameTime = 0;
      requestAnimationFrame(this.animate.bind(this));
      
      // Redimensionar quando a janela mudar de tamanho
      window.addEventListener('resize', this.handleResize.bind(this));
    }
    
    setupKeyboard() {
      // Número de oitavas
      const startOctave = this.config.startOctave;
      const endOctave = this.config.endOctave;
      const octaves = endOctave - startOctave + 1;
      
      // Configuração das teclas
      const whiteKeysPerOctave = 7;
      const totalWhiteKeys = whiteKeysPerOctave * octaves;
      
      // Configuração da largura das teclas
      const whiteKeyWidth = this.config.width / totalWhiteKeys;
      this.config.noteWidth = this.config.noteWidth || whiteKeyWidth;
      
      // Definir as dimensões das teclas
      this.whiteKeyWidth = whiteKeyWidth;
      this.whiteKeyHeight = this.config.keyboardHeight;
      this.blackKeyWidth = this.whiteKeyWidth * 0.65;
      this.blackKeyHeight = this.config.keyboardHeight * 0.65;
      
      // Gerar as teclas
      this.keys = [];
      
      // Mapeamento de notas MIDI para as teclas
      this.noteToKeyMap = {};
      
      let currentX = 0;
      let noteNumber = startOctave * 12;
      
      for (let octave = startOctave; octave <= endOctave; octave++) {
        // Teclas brancas em cada oitava: C, D, E, F, G, A, B
        const whiteKeys = [0, 2, 4, 5, 7, 9, 11];
        
        for (let i = 0; i < whiteKeys.length; i++) {
          const note = octave * 12 + whiteKeys[i];
          this.keys.push({
            x: currentX,
            y: this.config.height - this.whiteKeyHeight,
            width: this.whiteKeyWidth,
            height: this.whiteKeyHeight,
            note: note,
            type: 'white',
            isActive: false,
            activeTime: 0,
            velocity: 0
          });
          
          this.noteToKeyMap[note] = this.keys.length - 1;
          currentX += this.whiteKeyWidth;
        }
      }
      
      // Adicionar teclas pretas
      currentX = 0;
      for (let octave = startOctave; octave <= endOctave; octave++) {
        // Padrão de teclas pretas: depois de C, D, F, G, A
        const blackKeyPositions = [1, 3, 6, 8, 10];
        
        for (let i = 0; i < 7; i++) {
          if (blackKeyPositions.includes((octave * 12 + i) % 12)) {
            const note = octave * 12 + i;
            const blackKeyX = currentX - (this.blackKeyWidth / 2);
            
            this.keys.push({
              x: blackKeyX,
              y: this.config.height - this.whiteKeyHeight,
              width: this.blackKeyWidth,
              height: this.blackKeyHeight,
              note: note,
              type: 'black',
              isActive: false,
              activeTime: 0,
              velocity: 0
            });
            
            this.noteToKeyMap[note] = this.keys.length - 1;
          }
          
          currentX += this.whiteKeyWidth;
        }
      }
    }
    
    loadMIDIFile(url) {
      return new Promise((resolve, reject) => {
        // Precisamos do lib MIDIParser
        if (typeof MIDIParser === 'undefined') {
          // Carrega a biblioteca MIDIParser se não estiver disponível
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/midi-parser-js/midi-parser.min.js';
          script.onload = () => this.fetchAndParseMIDI(url, resolve, reject);
          script.onerror = () => reject(new Error('Failed to load MIDIParser library'));
          document.head.appendChild(script);
        } else {
          this.fetchAndParseMIDI(url, resolve, reject);
        }
      });
    }
    
    fetchAndParseMIDI(url, resolve, reject) {
      fetch(url)
        .then(response => {
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          return response.arrayBuffer();
        })
        .then(arrayBuffer => {
          // Converter ArrayBuffer para Array de bytes
          const byteArray = new Uint8Array(arrayBuffer);
          
          // Analisar o arquivo MIDI
          const midiFile = MIDIParser.parse(byteArray);
          
          // Processar os eventos MIDI
          this.processMIDIData(midiFile);
          resolve(midiFile);
        })
        .catch(error => {
          reject(error);
        });
    }
    
    processMIDIData(midiFile) {
      this.notes = [];
      this.midiData = midiFile;
      
      // Taxa de ticks por batida
      const ticksPerBeat = midiFile.timeDivision;
      
      // Processar faixas
      midiFile.track.forEach(track => {
        let currentTime = 0;
        
        track.event.forEach(event => {
          currentTime += event.deltaTime;
          
          // Nota ligada
          if (event.type === 9 && event.data[1] > 0) {
            const note = event.data[0];
            const velocity = event.data[1] / 127;
            const timestamp = currentTime / ticksPerBeat;
            
            // Encontrar o evento de "nota desligada" correspondente
            let endTimestamp = null;
            
            // Procurar evento de nota desligada
            for (let i = track.event.indexOf(event) + 1; i < track.event.length; i++) {
              const nextEvent = track.event[i];
              const nextTime = currentTime + nextEvent.deltaTime;
              
              if ((nextEvent.type === 8 || (nextEvent.type === 9 && nextEvent.data[1] === 0)) &&
                  nextEvent.data[0] === note) {
                endTimestamp = nextTime / ticksPerBeat;
                break;
              }
            }
            
            if (endTimestamp !== null) {
              this.notes.push({
                note: note,
                velocity: velocity,
                startTime: timestamp,
                endTime: endTimestamp,
                duration: endTimestamp - timestamp
              });
            }
          }
        });
      });
      
      // Ordenar notas por tempo de início
      this.notes.sort((a, b) => a.startTime - b.startTime);
      
      // Calcular a duração total da música
      this.duration = Math.max(...this.notes.map(note => note.endTime)) || 0;
    }
    
    play() {
      if (this.playerStatus === 'playing') return;
      
      this.playerStatus = 'playing';
      this.startTime = performance.now() / 1000;
      this.currentTime = 0;
      
      if (this.onPlay) this.onPlay();
    }
    
    pause() {
      if (this.playerStatus !== 'playing') return;
      
      this.playerStatus = 'paused';
      this.pauseTime = this.currentTime;
      
      if (this.onPause) this.onPause();
    }
    
    stop() {
      if (this.playerStatus === 'stopped') return;
      
      this.playerStatus = 'stopped';
      this.currentTime = 0;
      this.activeNotes = {};
      
      if (this.onStop) this.onStop();
    }
    
    resume() {
      if (this.playerStatus !== 'paused') return;
      
      this.playerStatus = 'playing';
      this.startTime = performance.now() / 1000 - this.pauseTime;
      
      if (this.onResume) this.onResume();
    }
    
    animate(timestamp) {
      const deltaTime = (timestamp - this.lastFrameTime) / 1000;
      this.lastFrameTime = timestamp;
      
      // Limpar canvas
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.reflectionCtx.clearRect(0, 0, this.reflectionCanvas.width, this.reflectionCanvas.height);
      
      // Atualizar tempo atual se estiver reproduzindo
      if (this.playerStatus === 'playing') {
        this.currentTime = performance.now() / 1000 - this.startTime;
        
        // Verificar se a reprodução chegou ao fim
        if (this.currentTime >= this.duration) {
          this.stop();
        }
      }
      
      // Desenhar fundo com gradiente
      this.drawBackground();
      
      // Processar as notas ativas
      this.processActiveNotes();
      
      // Desenhar as notas em queda
      this.drawFallingNotes();
      
      // Desenhar o teclado
      this.drawKeyboard();
      
      // Atualizar e desenhar partículas
      if (this.config.particleEffect) {
        this.updateParticles(deltaTime);
        this.drawParticles();
      }
      
      // Desenhar reflexos se ativado
      if (this.config.reflectionEffect) {
        this.drawReflections();
      }
      
      // Continuar animação
      requestAnimationFrame(this.animate.bind(this));
    }
    
    drawBackground() {
      // Gradiente suave para o fundo
      const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
      gradient.addColorStop(0, '#0a0a0a');
      gradient.addColorStop(1, '#1a1a1a');
      
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      
      // Adicionar um brilho sutilmente no centro
      const radialGradient = this.ctx.createRadialGradient(
        this.canvas.width / 2, this.canvas.height / 2, 0,
        this.canvas.width / 2, this.canvas.height / 2, this.canvas.width / 1.5
      );
      
      radialGradient.addColorStop(0, 'rgba(0, 132, 255, 0.1)');
      radialGradient.addColorStop(1, 'rgba(0, 132, 255, 0)');
      
      this.ctx.fillStyle = radialGradient;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      
      // Linhas de grade sutis
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      this.ctx.lineWidth = 1;
      
      // Linhas horizontais
      for (let y = this.config.height - this.config.keyboardHeight - 20; y >= 0; y -= 30) {
        this.ctx.beginPath();
        this.ctx.moveTo(0, y);
        this.ctx.lineTo(this.canvas.width, y);
        this.ctx.stroke();
      }
    }
    
    processActiveNotes() {
      if (this.playerStatus !== 'playing') return;
      
      // Encontrar notas que devem começar agora
      this.notes.forEach(note => {
        if (note.startTime <= this.currentTime && note.endTime >= this.currentTime) {
          // Só adicionar se ainda não estiver ativa
          if (!this.activeNotes[note.note]) {
            this.activeNotes[note.note] = {
              velocity: note.velocity,
              startTime: performance.now(),
              duration: (note.endTime - note.startTime) * 1000 // Converter para ms
            };
            
            // Ativar a tecla correspondente
            const keyIndex = this.noteToKeyMap[note.note];
            if (keyIndex !== undefined) {
              this.keys[keyIndex].isActive = true;
              this.keys[keyIndex].activeTime = performance.now();
              this.keys[keyIndex].velocity = note.velocity;
              
              // Adicionar partículas quando a nota é ativada
              if (this.config.particleEffect) {
                this.createNoteParticles(this.keys[keyIndex]);
              }
            }
          }
        }
        // Desativar notas que terminaram
        else if (note.endTime < this.currentTime) {
          if (this.activeNotes[note.note]) {
            delete this.activeNotes[note.note];
            
            // Desativar a tecla correspondente
            const keyIndex = this.noteToKeyMap[note.note];
            if (keyIndex !== undefined) {
              this.keys[keyIndex].isActive = false;
            }
          }
        }
      });
    }
    
    drawFallingNotes() {
      const keyboardY = this.config.height - this.config.keyboardHeight;
      const visibleDuration = keyboardY / (this.config.fallSpeed * 60); // Em segundos
      
      // Filtrar notas que deveriam ser visíveis agora
      const visibleNotes = this.notes.filter(note => {
        return note.endTime >= this.currentTime - 0.5 && // Notas que acabaram de terminar
               note.startTime <= this.currentTime + visibleDuration; // Notas que vão começar
      });
      
      visibleNotes.forEach(note => {
        const keyIndex = this.noteToKeyMap[note.note];
        if (keyIndex === undefined) return;
        
        const key = this.keys[keyIndex];
        const noteWidth = key.type === 'white' ? this.whiteKeyWidth : this.blackKeyWidth;
        
        // Posição Y de início e fim
        const startY = keyboardY - (note.startTime - this.currentTime) * (this.config.fallSpeed * 60);
        const endY = keyboardY - (note.endTime - this.currentTime) * (this.config.fallSpeed * 60);
        
        // Dimensões da nota
        const noteHeight = Math.max(5, startY - endY);
        const noteX = key.x;
        const noteY = Math.min(startY, keyboardY);
        
        // Só desenhar se estiver no campo de visão
        if (endY > 0 && startY < keyboardY) {
          // Gradiente para a nota
          const noteGradient = this.ctx.createLinearGradient(noteX, noteY, noteX + noteWidth, noteY + noteHeight);
          
          if (key.type === 'white') {
            noteGradient.addColorStop(0, 'rgba(0, 132, 255, 0.7)');
            noteGradient.addColorStop(1, 'rgba(0, 214, 255, 0.7)');
            this.ctx.fillStyle = noteGradient;
          } else {
            noteGradient.addColorStop(0, 'rgba(0, 100, 230, 0.8)');
            noteGradient.addColorStop(1, 'rgba(0, 180, 230, 0.8)');
            this.ctx.fillStyle = noteGradient;
          }
          
          // Desenhar retângulo da nota
          this.ctx.beginPath();
          this.ctx.roundRect(
            noteX, 
            noteY, 
            noteWidth, 
            Math.min(noteHeight, keyboardY - noteY),
            [4, 4, 0, 0]
          );
          this.ctx.fill();
          
          // Desenhar bordas brilhantes
          this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
          this.ctx.lineWidth = 1;
          this.ctx.stroke();
          
          // Adicionar brilho neon
          if (note.startTime <= this.currentTime && note.endTime >= this.currentTime) {
            this.ctx.shadowColor = this.config.glowColor;
            this.ctx.shadowBlur = this.config.glowSize;
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            this.ctx.shadowBlur = 0;
          }
        }
      });
    }
    
    drawKeyboard() {
      // Primeiro desenhar todas as teclas brancas
      this.keys.forEach(key => {
        if (key.type === 'white') {
          this.drawKey(key);
        }
      });
      
      // Depois desenhar todas as teclas pretas (para ficarem por cima)
      this.keys.forEach(key => {
        if (key.type === 'black') {
          this.drawKey(key);
        }
      });
    }
    
    drawKey(key) {
      // Determinar cor base da tecla
      let keyColor;
      if (key.isActive) {
        // Cor para tecla ativa com base na velocidade
        const intensity = key.velocity;
        keyColor = this.config.activeKeyColor;
        
        // Adicionar efeito de brilho enquanto a tecla está ativa
        this.ctx.shadowColor = this.config.glowColor;
        this.ctx.shadowBlur = this.config.glowSize * intensity;
      } else {
        // Cor normal para tecla inativa
        keyColor = key.type === 'white' ? this.config.whiteKeyColor : this.config.blackKeyColor;
        
        // Verificar se a tecla foi recentemente ativa (para efeito de fade out)
        if (key.activeTime > 0) {
          const elapsed = performance.now() - key.activeTime;
          if (elapsed < this.config.fadeOutTime) {
            // Calcular a mistura entre a cor ativa e inativa
            const ratio = 1 - (elapsed / this.config.fadeOutTime);
            const r1 = parseInt(this.config.activeKeyColor.slice(1, 3), 16);
            const g1 = parseInt(this.config.activeKeyColor.slice(3, 5), 16);
            const b1 = parseInt(this.config.activeKeyColor.slice(5, 7), 16);
            
            let r2, g2, b2;
            if (key.type === 'white') {
              r2 = parseInt(this.config.whiteKeyColor.slice(1, 3), 16);
              g2 = parseInt(this.config.whiteKeyColor.slice(3, 5), 16);
              b2 = parseInt(this.config.whiteKeyColor.slice(5, 7), 16);
            } else {
              r2 = parseInt(this.config.blackKeyColor.slice(1, 3), 16);
              g2 = parseInt(this.config.blackKeyColor.slice(3, 5), 16);
              b2 = parseInt(this.config.blackKeyColor.slice(5, 7), 16);
            }
            
            const r = Math.round(r2 + (r1 - r2) * ratio);
            const g = Math.round(g2 + (g1 - g2) * ratio);
            const b = Math.round(b2 + (b1 - b2) * ratio);
            
            keyColor = `rgb(${r}, ${g}, ${b})`;
            
            // Adicionar brilho residual
            this.ctx.shadowColor = this.config.glowColor;
            this.ctx.shadowBlur = this.config.glowSize * ratio * key.velocity;
          } else {
            key.activeTime = 0; // Resetar quando o fade-out termina
          }
        }
      }
      
      // Desenhar a tecla com bordas arredondadas
      this.ctx.beginPath();
      if (key.type === 'white') {
        this.ctx.roundRect(
          key.x, 
          key.y, 
          key.width, 
          key.height,
          [0, 0, 4, 4]
        );
      } else {
        this.ctx.roundRect(
          key.x, 
          key.y, 
          key.width, 
          key.height,
          [0, 0, 3, 3]
        );
      }
      
      // Preencher com gradiente
      const gradient = this.ctx.createLinearGradient(key.x, key.y, key.x, key.y + key.height);
      if (key.type === 'white') {
        if (key.isActive) {
          gradient.addColorStop(0, this.hexToRgba(keyColor, 0.9));
          gradient.addColorStop(1, this.hexToRgba(keyColor, 1));
        } else {
          gradient.addColorStop(0, this.hexToRgba(keyColor, 1));
          gradient.addColorStop(0.97, this.hexToRgba(keyColor, 0.9));
          gradient.addColorStop(1, this.hexToRgba(keyColor, 0.7));
        }
      } else {
        if (key.isActive) {
          gradient.addColorStop(0, this.hexToRgba(keyColor, 0.9));
          gradient.addColorStop(1, this.hexToRgba(keyColor, 1));
        } else {
          gradient.addColorStop(0, this.hexToRgba(keyColor, 1));
          gradient.addColorStop(1, this.hexToRgba(keyColor, 0.8));
        }
      }
      
      this.ctx.fillStyle = gradient;
      this.ctx.fill();
      
      // Adicionar borda
      if (key.type === 'white') {
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
      } else {
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
      }
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
      
      // Resetar sombra
      this.ctx.shadowBlur = 0;
    }
    
    createNoteParticles(key) {
      const particleCount = Math.floor(5 + key.velocity * 10);
      const keyCenter = key.x + key.width / 2;
      
      for (let i = 0; i < particleCount; i++) {
        this.particles.push({
          x: keyCenter + (Math.random() * key.width / 2) - key.width / 4,
          y: key.y,
          size: Math.random() * 4 + 1,
          speedX: (Math.random() - 0.5) * 3,
          speedY: -Math.random() * 5 - 2,
          color: this.config.activeKeyColor,
          alpha: Math.random() * 0.7 + 0.3,
          life: Math.random() * 1000 + 500
        });
      }
    }
    
    updateParticles(deltaTime) {
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const particle = this.particles[i];
        
        // Atualizar posição
        particle.x += particle.speedX;
        particle.y += particle.speedY;
        
        // Adicionar efeito de gravidade
        particle.speedY += 0.1;
        
        // Reduzir a vida da partícula
        particle.life -= deltaTime * 1000;
        particle.alpha = particle.life / 1000;
        
        // Remover partículas mortas
        if (particle.life <= 0) {
          this.particles.splice(i, 1);
        }
      }
    }
    
    drawParticles() {
      for (const particle of this.particles) {
        this.ctx.beginPath();
        this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        this.ctx.fillStyle = this.hexToRgba(particle.color, particle.alpha);
        this.ctx.shadowColor = this.config.glowColor;
        this.ctx.shadowBlur = 5;
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
      }
    }
    
    drawReflections() {
      // Desenhar reflexo do teclado e notas
      this.reflectionCtx.save();
      this.reflectionCtx.scale(1, -0.2); // Espelhar verticalmente com escala reduzida
      this.reflectionCtx.translate(0, -this.canvas.height * 2.8); // Posicionar o reflexo
      this.reflectionCtx.drawImage(this.canvas, 0, 0);
      this.reflectionCtx.restore();
      
      // Adicionar efeito de gradiente sobre o reflexo
      const gradient = this.reflectionCtx.createLinearGradient(0, this.canvas.height - this.config.keyboardHeight, 0, this.canvas.height);
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0.6)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0.95)');
      
      this.reflectionCtx.fillStyle = gradient;
      this.reflectionCtx.fillRect(0, this.canvas.height - this.config.keyboardHeight, this.canvas.width, this.config.keyboardHeight);
    }
    
    // Utilitários
    hexToRgba(hex, alpha) {
      if (hex.startsWith('rgb')) return hex; // Já é RGB/RGBA
      
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    
    handleResize() {
      // Atualizar tamanho do canvas
      this.canvas.width = this.container.offsetWidth;
      this.config.width = this.container.offsetWidth;
      this.reflectionCanvas.width = this.container.offsetWidth;
      
      // Recalcular teclado
      this.setupKeyboard();
    }
    
    // Métodos para controle de tempo
    setTime(seconds) {
      this.currentTime = seconds;
      if (this.playerStatus === 'playing') {
        this.startTime = performance.now() / 1000 - seconds;
      }
    }
    
    getTime() {
      return this.currentTime;
    }
    
    getDuration() {
      return this.duration;
    }
  }
  
// Utilitários para carregamento de arquivos MIDI locais
function setupMIDIFileInput(pianoViz, inputId, playButtonId, pauseButtonId, stopButtonId) {
    const fileInput = document.getElementById(inputId);
    const playButton = document.getElementById(playButtonId);
    const pauseButton = document.getElementById(pauseButtonId);
    const stopButton = document.getElementById(stopButtonId);
    
    if (!fileInput) {
      console.error(`File input with ID "${inputId}" not found`);
      return;
    }
    
    fileInput.addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = function(e) {
        const arrayBuffer = e.target.result;
        const byteArray = new Uint8Array(arrayBuffer);
        
        // Carregar MIDIParser se não estiver disponível
        if (typeof MIDIParser === 'undefined') {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/midi-parser-js/midi-parser.min.js';
          script.onload = () => {
            const midiFile = MIDIParser.parse(byteArray);
            pianoViz.processMIDIData(midiFile);
          };
          document.head.appendChild(script);
        } else {
          const midiFile = MIDIParser.parse(byteArray);
          pianoViz.processMIDIData(midiFile);
        }
      };
      reader.readAsArrayBuffer(file);
    });
    
    // Configurar botões de controle
    if (playButton) {
      playButton.addEventListener('click', () => {
        if (pianoViz.playerStatus === 'paused') {
          pianoViz.resume();
        } else {
          pianoViz.play();
        }
      });
    }
    
    if (pauseButton) {
      pauseButton.addEventListener('click', () => {
        pianoViz.pause();
      });
    }
    
    if (stopButton) {
      stopButton.addEventListener('click', () => {
        pianoViz.stop();
      });
    }
  }
  
  // Interface de usuário para controle do piano
  class PianoVizUI {
    constructor(pianoViz, containerId) {
      this.pianoViz = pianoViz;
      this.container = document.getElementById(containerId);
      
      if (!this.container) {
        throw new Error(`UI container with ID "${containerId}" not found`);
      }
      
      this.init();
    }
    
    init() {
      // Criar elementos da interface
      this.createControlPanel();
      
      // Iniciar atualizações da interface
      this.updateTimer = setInterval(() => this.updateUI(), 100);
    }
    
    createControlPanel() {
      const controlPanel = document.createElement('div');
      controlPanel.className = 'piano-viz-controls';
      controlPanel.style.cssText = `
        padding: 15px;
        background: rgba(0, 0, 0, 0.7);
        border-radius: 12px;
        margin-top: 10px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
      `;
      
      // Área de arquivo MIDI
      const fileArea = document.createElement('div');
      fileArea.style.cssText = `
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 10px;
      `;
      
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.id = 'midi-file-input';
      fileInput.accept = '.mid,.midi';
      fileInput.style.display = 'none';
      
      const fileLabel = document.createElement('label');
      fileLabel.htmlFor = 'midi-file-input';
      fileLabel.textContent = 'Escolher arquivo MIDI';
      fileLabel.style.cssText = `
        padding: 8px 15px;
        background: linear-gradient(to bottom, #0084ff, #0060df);
        color: white;
        border-radius: 6px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
      `;
      fileLabel.onmouseover = () => {
        fileLabel.style.background = 'linear-gradient(to bottom, #0096ff, #0070ef)';
      };
      fileLabel.onmouseout = () => {
        fileLabel.style.background = 'linear-gradient(to bottom, #0084ff, #0060df)';
      };
      
      const fileName = document.createElement('span');
      fileName.textContent = 'Nenhum arquivo selecionado';
      fileName.style.cssText = `
        color: rgba(255, 255, 255, 0.7);
        font-size: 14px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      `;
      
      fileArea.appendChild(fileInput);
      fileArea.appendChild(fileLabel);
      fileArea.appendChild(fileName);
      
      // Controles de reprodução
      const playbackControls = document.createElement('div');
      playbackControls.style.cssText = `
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 5px;
      `;
      
      const createButton = (icon, action, tooltip) => {
        const button = document.createElement('button');
        button.innerHTML = icon;
        button.title = tooltip;
        button.style.cssText = `
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          border: none;
          color: white;
          font-size: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        `;
        button.onmouseover = () => {
          button.style.background = 'rgba(255, 255, 255, 0.2)';
        };
        button.onmouseout = () => {
          button.style.background = 'rgba(255, 255, 255, 0.1)';
        };
        button.onclick = action;
        return button;
      };
      
      const playButton = createButton(
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>', 
        () => {
          if (this.pianoViz.playerStatus === 'paused') {
            this.pianoViz.resume();
          } else {
            this.pianoViz.play();
          }
        },
        'Reproduzir'
      );
      
      const pauseButton = createButton(
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>', 
        () => this.pianoViz.pause(),
        'Pausar'
      );
      
      const stopButton = createButton(
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16"></rect></svg>', 
        () => this.pianoViz.stop(),
        'Parar'
      );
      
      playbackControls.appendChild(playButton);
      playbackControls.appendChild(pauseButton);
      playbackControls.appendChild(stopButton);
      
      // Barra de progresso
      const progressArea = document.createElement('div');
      progressArea.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 5px;
        width: 100%;
      `;
      
      const progressBar = document.createElement('input');
      progressBar.type = 'range';
      progressBar.min = 0;
      progressBar.max = 100;
      progressBar.value = 0;
      progressBar.id = 'progress-bar';
      progressBar.style.cssText = `
        width: 100%;
        height: 5px;
        -webkit-appearance: none;
        appearance: none;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 3px;
        outline: none;
      `;
      
      // Estilo do controle deslizante
      const sliderStyle = document.createElement('style');
      sliderStyle.textContent = `
        #progress-bar::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 15px;
          height: 15px;
          border-radius: 50%;
          background: #0084ff;
          cursor: pointer;
          box-shadow: 0 0 5px rgba(0, 132, 255, 0.7);
        }
        
        #progress-bar::-moz-range-thumb {
          width: 15px;
          height: 15px;
          border-radius: 50%;
          background: #0084ff;
          cursor: pointer;
          box-shadow: 0 0 5px rgba(0, 132, 255, 0.7);
          border: none;
        }
      `;
      document.head.appendChild(sliderStyle);
      
      const timeDisplay = document.createElement('div');
      timeDisplay.style.cssText = `
        display: flex;
        justify-content: space-between;
        color: rgba(255, 255, 255, 0.7);
        font-size: 12px;
      `;
      
      const currentTime = document.createElement('span');
      currentTime.textContent = '0:00';
      currentTime.id = 'current-time';
      
      const totalTime = document.createElement('span');
      totalTime.textContent = '0:00';
      totalTime.id = 'total-time';
      
      timeDisplay.appendChild(currentTime);
      timeDisplay.appendChild(totalTime);
      
      progressArea.appendChild(progressBar);
      progressArea.appendChild(timeDisplay);
      
      // Configuração de eventos
      progressBar.addEventListener('input', () => {
        const time = (progressBar.value / 100) * this.pianoViz.getDuration();
        this.pianoViz.setTime(time);
      });
      
      fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        fileName.textContent = file.name;
        
        const reader = new FileReader();
        reader.onload = (e) => {
          const arrayBuffer = e.target.result;
          const byteArray = new Uint8Array(arrayBuffer);
          
          // Carregar MIDIParser se não estiver disponível
          if (typeof MIDIParser === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/midi-parser-js/midi-parser.min.js';
            script.onload = () => {
              const midiFile = MIDIParser.parse(byteArray);
              this.pianoViz.processMIDIData(midiFile);
              this.updateTotalTime();
            };
            document.head.appendChild(script);
          } else {
            const midiFile = MIDIParser.parse(byteArray);
            this.pianoViz.processMIDIData(midiFile);
            this.updateTotalTime();
          }
        };
        reader.readAsArrayBuffer(file);
      });
      
      // Adicionar tudo ao painel de controle
      controlPanel.appendChild(fileArea);
      controlPanel.appendChild(playbackControls);
      controlPanel.appendChild(progressArea);
      
      // Adicionar o painel à página
      this.container.appendChild(controlPanel);
      
      // Salvar referências para atualização
      this.progressBar = progressBar;
      this.currentTimeDisplay = currentTime;
      this.totalTimeDisplay = totalTime;
      this.fileName = fileName;
    }
    
    updateUI() {
      if (!this.pianoViz) return;
      
      // Atualizar posição da barra de progresso
      const duration = this.pianoViz.getDuration();
      if (duration > 0) {
        const currentTime = this.pianoViz.getTime();
        const percentage = (currentTime / duration) * 100;
        this.progressBar.value = percentage;
        
        // Atualizar display de tempo
        this.currentTimeDisplay.textContent = this.formatTime(currentTime);
      }
    }
    
    updateTotalTime() {
      const duration = this.pianoViz.getDuration();
      this.totalTimeDisplay.textContent = this.formatTime(duration);
    }
    
    formatTime(seconds) {
      const minutes = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  }
  
  // Criação de um exemplo de HTML para usar a biblioteca
  function createExampleHTML() {
    return `
  <!DOCTYPE html>
  <html lang="pt-br">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Visualizador MIDI de Piano - Neon Edition</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      }
      
      body {
        background-color: #000;
        color: #fff;
        display: flex;
        flex-direction: column;
        align-items: center;
        min-height: 100vh;
        padding: 20px;
      }
      
      .container {
        width: 100%;
        max-width: 1200px;
        margin: 0 auto;
      }
      
      header {
        text-align: center;
        margin-bottom: 30px;
      }
      
      h1 {
        font-size: 2.5rem;
        margin-bottom: 10px;
        color: #0084ff;
        text-shadow: 0 0 10px rgba(0, 132, 255, 0.5);
      }
      
      p {
        color: rgba(255, 255, 255, 0.7);
        max-width: 600px;
        margin: 0 auto;
        line-height: 1.6;
      }
      
      .piano-container {
        width: 100%;
        height: 400px;
        margin-bottom: 20px;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      }
      
      .controls-container {
        width: 100%;
      }
      
      footer {
        margin-top: 40px;
        text-align: center;
        font-size: 0.8rem;
        color: rgba(255, 255, 255, 0.4);
      }
    </style>
  </head>
  <body>
    <div class="container">
      <header>
        <h1>Visualizador MIDI de Piano</h1>
        <p>Visualize arquivos MIDI com uma animação de piano em estilo neon</p>
      </header>
      
      <div class="piano-container" id="piano-container"></div>
      <div class="controls-container" id="controls-container"></div>
      
      <footer>
        <p>Criado com PianoViz - Biblioteca para visualização MIDI</p>
      </footer>
    </div>
    
    <script src="https://cdn.jsdelivr.net/npm/midi-parser-js/midi-parser.min.js"></script>
    <script src="piano-viz.js"></script>
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        // Criar instância do PianoViz
        const pianoViz = new PianoViz('piano-container', {
          height: 400,
          backgroundColor: '#121212',
          activeKeyColor: '#0084ff',
          glowColor: 'rgba(0, 132, 255, 0.7)',
          startOctave: 1,
          endOctave: 7
        });
        
        // Criar interface de usuário
        const ui = new PianoVizUI(pianoViz, 'controls-container');
        
        // Carregar um arquivo MIDI de demonstração (opcional)
        /*
        pianoViz.loadMIDIFile('example.mid')
          .then(() => {
            console.log('Arquivo MIDI carregado com sucesso');
          })
          .catch(error => {
            console.error('Erro ao carregar arquivo MIDI:', error);
          });
        */
      });
    </script>
  </body>
  </html>
    `;
  }