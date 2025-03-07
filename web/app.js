document.addEventListener('DOMContentLoaded', function() {
    // Custom cursor
    const cursor = document.getElementById('cursor');
    const glow = document.getElementById('glow');
    
    // Only apply custom cursor on non-touch devices
    if (!('ontouchstart' in window)) {
      document.addEventListener('mousemove', (e) => {
        cursor.style.left = `${e.clientX}px`;
        cursor.style.top = `${e.clientY}px`;
        
        glow.style.left = `${e.clientX}px`;
        glow.style.top = `${e.clientY}px`;
      });
      
      // Enlarge cursor on interactive elements
      document.querySelectorAll('a, button, .browse-button, input[type="file"]').forEach(el => {
        el.addEventListener('mouseenter', () => {
          cursor.style.width = '40px';
          cursor.style.height = '40px';
          cursor.style.borderColor = 'rgba(0, 132, 255, 0.7)';
        });
        
        el.addEventListener('mouseleave', () => {
          cursor.style.width = '30px';
          cursor.style.height = '30px';
          cursor.style.borderColor = 'rgba(255, 255, 255, 0.5)';
        });
      });
    }
    
    // Create PianoViz instance with Moises colors
    // const pianoViz = new PianoViz('piano-container', {
    //   height: 400,
    //   backgroundColor: '#121212',
    //   activeKeyColor: '#0084ff', // Moises blue
    //   glowColor: 'rgba(0, 132, 255, 0.7)',
    //   startOctave: 1,
    //   endOctave: 7,
    //   particleEffect: true,
    //   reflectionEffect: true,
    //   glowIntensity: 0.9,
    //   fallSpeed: 2.5
    // });
    
    // Create UI
    // const ui = new PianoVizUI(pianoViz, 'controls-container');
    
    // Drag and drop functionality
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    // const pianoContainer = document.getElementById('piano-container');
    
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, preventDefaults, false);
      document.body.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Highlight drop zone when dragging over it
    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, unhighlight, false);
    });
    
    function highlight() {
      dropZone.classList.add('active');
    }
    
    function unhighlight() {
      dropZone.classList.remove('active');
    }
    
    // Handle dropped files
    dropZone.addEventListener('drop', handleDrop, false);
    
    function handleDrop(e) {
      const dt = e.dataTransfer;
      const files = dt.files;
      handleFiles(files);
    }
    
    // Handle selected files via button
    fileInput.addEventListener('change', function() {
      handleFiles(this.files);
    });
    
    function handleFiles(files) {
      if (files.length > 0) {
        const file = files[0];
        
        // Check if file is MIDI
        if (file.name.endsWith('.mid') || file.name.endsWith('.midi')) {
          // Hide drop zone
          dropZone.style.display = 'none';
          
          // Read file
          const reader = new FileReader();
          reader.onload = function(e) {
            const arrayBuffer = e.target.result;
            const byteArray = new Uint8Array(arrayBuffer);
            const midiFile = MIDIParser.parse(byteArray);
            pianoViz.processMIDIData(midiFile);
          };
          reader.readAsArrayBuffer(file);
        } else {
          alert('Por favor, selecione um arquivo MIDI válido (.mid ou .midi)');
        }
      }
    }
  });