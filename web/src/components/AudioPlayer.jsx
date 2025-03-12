// AudioPlayer.jsx
import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import styles from './AudioPlayer.module.css';

// SVG Icon Components
const MuteIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M8.33894 15.1563V18.9119C8.33894 19.8197 7.72758 20.6136 6.84994 20.8455L4.70094 21.4134C3.43228 21.7487 2.18994 20.792 2.18994 19.4798V18.3214C2.18994 17.4136 2.80131 16.6197 3.67894 16.3878L8.33894 15.1563ZM8.33894 15.1563V5.2193C8.33894 4.76671 8.64292 4.37054 9.08008 4.25339L19.9611 1.33737C20.5962 1.16716 21.2199 1.64574 21.2199 2.30329V11.6875M21.2199 11.6875V15.4598C21.2199 16.3676 20.6085 17.1616 19.7309 17.3935L17.5809 17.9616C16.3122 18.2968 15.0699 17.3401 15.0699 16.0279V14.8764C15.0699 13.9721 15.6767 13.1804 16.5499 12.9452L21.2199 11.6875Z" stroke="white" stroke-width="1.5" stroke-miterlimit="10"/>
  </svg>

);

const UnmuteIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M21.2199 11.6875V2.30329C21.2199 1.64574 20.5962 1.16716 19.9611 1.33737L9.08008 4.25339C8.64292 4.37054 8.33894 4.76671 8.33894 5.2193V8M21.2199 11.6875V15.4598C21.2199 16.3676 20.6085 17.1616 19.7309 17.3935L18.1449 17.8125M21.2199 11.6875L16.5499 12.9452C15.6767 13.1804 15.0699 13.9721 15.0699 14.8764V14.9844M8.33894 15.1563L3.67894 16.3878C2.80131 16.6197 2.18994 17.4136 2.18994 18.3214V19.4798C2.18994 20.792 3.43228 21.7487 4.70094 21.4134L6.84994 20.8455C7.72758 20.6136 8.33894 19.8197 8.33894 18.9119V15.1563ZM8.33894 15.1563V13M3 3.00001L21 21" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>

);

const ChordIcon = () => (
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M11.5 5H3.8C3.63431 5 3.5 5.13431 3.5 5.3V12.5M11.5 19.5H3.8C3.63431 19.5 3.5 19.3657 3.5 19.2V12.5M10.5 12.5H3.5M15 3.5V13M15 13V16.7C15 16.8657 15.1346 17.0008 15.3001 16.9926C17.7974 16.8689 19.9307 15.2096 20.4023 12.8521C20.7771 10.9777 19.8229 8.98404 18.1189 8.98404C16.7046 8.98404 15 10.5 15 13Z" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
</svg>
);

const SheetMusicIcon = () => (
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M22 12H17.5M2 12H13.5M2 19H22M2 5H22" stroke="white" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round"/>
<path d="M17.1653 10.8843V13.0602C17.1653 13.9621 16.5617 14.7524 15.6917 14.9897L15.2566 15.1084C14.1202 15.4185 13 14.563 13 13.385C13 12.5795 13.5391 11.8736 14.3162 11.6616L17.1653 10.8843ZM17.1653 10.8843V2" stroke="white" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round"/>
</svg>

);

const KeysIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M7.13 2H10.63M13.38 2H16.88M8.875 14L8.875 21.875M15.125 14V21.875M4.625 22H19.375C20.4796 22 21.375 21.1046 21.375 20V4C21.375 2.89543 20.4796 2 19.375 2H4.625C3.52043 2 2.625 2.89543 2.625 4V20C2.625 21.1046 3.52043 22 4.625 22Z" stroke="white" stroke-width="1.5"/>
  <path d="M7.125 2.50391H10.625V14.0156H7.125V2.50391Z" fill="white"/>
  <path d="M13.37 2.50391H16.87V14.0156H13.37V2.50391Z" fill="white"/>
  </svg>

);

const NoKeysIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g clip-path="url(#clip0_1_49)">
  <path d="M16.6875 22.75C17.1017 22.75 17.4375 22.4142 17.4375 22C17.4375 21.5858 17.1017 21.25 16.6875 21.25V22.75ZM9.625 14.125C9.625 13.7108 9.28921 13.375 8.875 13.375C8.46079 13.375 8.125 13.7108 8.125 14.125H9.625ZM8.125 21.875C8.125 22.2892 8.46079 22.625 8.875 22.625C9.28921 22.625 9.625 22.2892 9.625 21.875H8.125ZM3.375 7.9375C3.375 7.52329 3.03921 7.1875 2.625 7.1875C2.21079 7.1875 1.875 7.52329 1.875 7.9375H3.375ZM1.53033 0.46967C1.23744 0.176777 0.762563 0.176777 0.46967 0.46967C0.176777 0.762563 0.176777 1.23744 0.46967 1.53033L1.53033 0.46967ZM22.4697 23.5303C22.7626 23.8232 23.2374 23.8232 23.5303 23.5303C23.8232 23.2374 23.8232 22.7626 23.5303 22.4697L22.4697 23.5303ZM20.625 4V20H22.125V4H20.625ZM16.6875 21.25H4.625V22.75H16.6875V21.25ZM8.125 14.125V21.875H9.625V14.125H8.125ZM4.625 21.25C3.93464 21.25 3.375 20.6904 3.375 20H1.875C1.875 21.5188 3.10622 22.75 4.625 22.75V21.25ZM19.375 2.75C20.0654 2.75 20.625 3.30964 20.625 4H22.125C22.125 2.48122 20.8938 1.25 19.375 1.25V2.75ZM4.625 2.75H19.375V1.25H4.625V2.75ZM3.375 20V7.9375H1.875V20H3.375ZM20.625 20C20.625 20.2463 20.5545 20.4739 20.4329 20.6663L21.701 21.4676C21.9696 21.0425 22.125 20.5382 22.125 20H20.625ZM20.4329 20.6663C20.431 20.6693 20.4291 20.6724 20.4271 20.6755L21.6881 21.4877C21.6924 21.4811 21.6967 21.4744 21.701 21.4676L20.4329 20.6663ZM4.625 1.25C3.65708 1.25 2.80652 1.75064 2.31751 2.50358L3.57548 3.3206C3.79957 2.97556 4.18616 2.75 4.625 2.75V1.25ZM0.46967 1.53033L20.5366 21.5973L21.5973 20.5366L1.53033 0.46967L0.46967 1.53033ZM20.5366 21.5973L22.4697 23.5303L23.5303 22.4697L21.5973 20.5366L20.5366 21.5973Z" fill="white"/>
  <path d="M7.125 2.50391H10.625V11.5625L7.125 8.0625V2.50391Z" fill="white"/>
  <path d="M13.37 2.50391H16.87V14.0156H13.37V2.50391Z" fill="white"/>
  </g>
  <defs>
  <clipPath id="clip0_1_49">
  <rect width="24" height="24" fill="white"/>
  </clipPath>
  </defs>
  </svg>
);

const PlayIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 3L19 12L5 21V3Z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const PauseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="4" width="4" height="16" fill="currentColor" stroke="currentColor" strokeWidth="0.5"/>
    <rect x="14" y="4" width="4" height="16" fill="currentColor" stroke="currentColor" strokeWidth="0.5"/>
  </svg>
);

const AudioPlayer = forwardRef(({ 
  audioData, 
  onTimeUpdate, 
  fileName, 
  onVisualizerToggle, 
  showSheetMusic,
  onMidiSoundToggle,
  isMidiSoundEnabled,
  onChordCarouselToggle,
  showChordCarousel
}, ref) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [displayTime, setDisplayTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  // Add playback rate state
  const [playbackRate, setPlaybackRate] = useState(1);
  const playbackRates = [0.25, 0.5, 1, 1.25, 1.5];
  
  const audioRef = useRef(null);
  const currentTimeRef = useRef(0);
  const seekingRef = useRef(false);
  const animationFrameRef = useRef(null);
  const seekBarContainerRef = useRef(null);
  // Add a ref to track the last time we updated the UI
  const lastUIUpdateRef = useRef(0);
  
  // Expose seekToTime function to parent components
  useImperativeHandle(ref, () => ({
    seekToTime: (timeInMs) => {
      seekToTime(timeInMs);
    }
  }));
  
  // Function to seek to a specific time in milliseconds
  const seekToTime = (timeInMs) => {
    seekingRef.current = true;
    
    const seekTimeInSeconds = timeInMs / 1000;
    currentTimeRef.current = seekTimeInSeconds;
    setDisplayTime(seekTimeInSeconds);
    setProgressPercent((seekTimeInSeconds / duration) * 100);
    
    if (audioRef.current) {
      audioRef.current.currentTime = seekTimeInSeconds;
    }
    
    // Schedule the seeking flag to be released
    setTimeout(() => {
      seekingRef.current = false;
      if (onTimeUpdate) {
        onTimeUpdate(timeInMs);
      }
    }, 50);
  };
  
  // Initialize audio with the provided data
  useEffect(() => {
    if (!audioData) return;
  
    let audioUrl;
    
    // Check if audioData is already an ObjectURL
    if (typeof audioData === 'string' && audioData.startsWith('blob:')) {
      audioUrl = audioData;
    } else {
      // Convert Blob/ArrayBuffer to ObjectURL
      const audioBlob = new Blob([audioData], { type: 'audio/wav' });
      audioUrl = URL.createObjectURL(audioBlob);
    }
    
    if (audioRef.current) {
      audioRef.current.src = audioUrl;
      audioRef.current.load();
      // Set initial playback rate
      audioRef.current.playbackRate = playbackRate;
    }
    
    // Only revoke URL if we created it
    return () => {
      if (audioUrl !== audioData) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioData]);

  // Update audio playback rate when it changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);
  
  // Handle metadata loaded
  const handleMetadataLoaded = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };
  
  // Set up a more efficient animation loop for time updates
  useEffect(() => {
    const updateTime = () => {
      if (audioRef.current && isPlaying && !seekingRef.current) {
        const time = audioRef.current.currentTime;
        const previousTime = currentTimeRef.current;
        currentTimeRef.current = time;
        
        // Throttle UI updates to 4 times per second (250ms)
        const now = Date.now();
        if (now - lastUIUpdateRef.current > 250) {
          setDisplayTime(time);
          setProgressPercent((time / (audioRef.current.duration || 1)) * 100);
          lastUIUpdateRef.current = now;
        }
        
        // Always report current time to parent for synchronization
        // even for small changes to ensure precise note visualization
        if (onTimeUpdate && (Math.abs(time - previousTime) > 0.01 || time !== previousTime)) {
          onTimeUpdate(time * 1000); // Convert to milliseconds for MIDI sync
        }
      }
      animationFrameRef.current = requestAnimationFrame(updateTime);
    };
    
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updateTime);
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isPlaying, onTimeUpdate, duration]); // Added duration as a dependency
  
  // Handle play/pause
  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };
  
  // Toggle mute function - mute but keep playing
  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !audioRef.current.muted;
      setIsMuted(!isMuted);
    }
  };
  
  // New function to handle MIDI sound toggle
  const handleMidiSoundToggle = () => {
    if (onMidiSoundToggle) {
      onMidiSoundToggle(!isMidiSoundEnabled);
    }
  };
  
  // Handle seek - fixed to prevent infinite loop
  const handleSeek = (e) => {
    const seekTime = parseFloat(e.target.value);
    seekToTime(seekTime * 1000); // Convert to milliseconds for consistency
  };
  
  // Format time as mm:ss
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle playback rate change
  const handlePlaybackRateChange = () => {
    const currentIndex = playbackRates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % playbackRates.length;
    setPlaybackRate(playbackRates[nextIndex]);
  };
  
  return (
    <div className={styles.audioPlayer}>
      <audio
        ref={audioRef}
        onLoadedMetadata={handleMetadataLoaded}
        onEnded={() => setIsPlaying(false)}
      />
      
      <div className={styles.playerInfo}>
        <span className={styles.fileName}>{fileName || 'Audio File'}</span>
      </div>
      
      <div className={styles.playerControls}>
        <button 
          className={`${styles.playButton} ${isPlaying ? styles.pauseButton : ''}`}
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>
        
        {/* Add mute button */}
        <button
          className={`${styles.controlButton} ${isMuted ? styles.activeMute : ''}`}
          onClick={toggleMute}
          aria-label={isMuted ? 'Unmute' : 'Mute'}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <MuteIcon /> : <UnmuteIcon />}
        </button>

        {/* Add playback rate button */}
        <button
          className={`${styles.controlButton} ${styles.rateButton}`}
          onClick={handlePlaybackRateChange}
          aria-label={`Change playback speed, current: ${playbackRate}x`}
          title="Change playback speed"
        >
          {playbackRate}x
        </button>
        
        {/* New MIDI sound toggle button */}
        {onMidiSoundToggle && (
          <button
            className={`${styles.controlButton} ${!isMidiSoundEnabled ? styles.midiSoundDisabled : ''}`}
            onClick={handleMidiSoundToggle}
            aria-label={isMidiSoundEnabled ? 'Disable MIDI Sound' : 'Enable MIDI Sound'}
            title={isMidiSoundEnabled ? 'Disable MIDI Sound' : 'Enable MIDI Sound'}
          >
            {isMidiSoundEnabled ? <KeysIcon /> : <NoKeysIcon />}
          </button>
        )}
        
        <div className={styles.timeInfo}>
          <span className={styles.currentTime}>{formatTime(displayTime)}</span>
          
          <div className={styles.seekBarContainer} ref={seekBarContainerRef}>
            <div 
              className={styles.seekBarProgress} 
              style={{ width: `${progressPercent}%` }}
            ></div>
            <div 
              className={styles.seekBarThumb} 
              style={{ left: `${progressPercent}%` }}
            ></div>
            <input
              type="range"
              className={styles.seekBar}
              min="0"
              max={duration || 0}
              step="0.01"
              value={displayTime}
              onChange={handleSeek}
            />
          </div>
          
          <span className={styles.duration}>{formatTime(duration)}</span>
        </div>
        
        {/* Add toggle button for switching visualizers */}
        {onVisualizerToggle && (
          <button
            className={`${styles.toggleButton} ${showSheetMusic ? styles.sheetMusicActive : ''}`}
            onClick={() => onVisualizerToggle(!showSheetMusic)}
            aria-label={showSheetMusic ? 'Show Notes' : 'Show Sheet Music'}
            title={showSheetMusic ? 'Show Notes' : 'Show Sheet Music'}
          >
            {showSheetMusic ? <KeysIcon /> : <SheetMusicIcon />}
          </button>
        )}
        
        {/* Add toggle button for chord carousel if available */}
        {onChordCarouselToggle && (
          <button
            className={`${styles.toggleButton} ${showChordCarousel ? styles.chordsActive : ''}`}
            onClick={onChordCarouselToggle}
            aria-label={showChordCarousel ? 'Hide Chords' : 'Show Chords'}
            title={showChordCarousel ? 'Hide Chords' : 'Show Chords'}
          >
            {showChordCarousel ? <ChordIcon /> : <ChordIcon />}
          </button>
        )}
      </div>
    </div>
  );
});

export default AudioPlayer;