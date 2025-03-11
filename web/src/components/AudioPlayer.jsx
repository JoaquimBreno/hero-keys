// AudioPlayer.jsx
import React, { useState, useRef, useEffect } from 'react';
import styles from './AudioPlayer.module.css';

export default function AudioPlayer({ 
  audioData, 
  onTimeUpdate, 
  fileName, 
  onVisualizerToggle, 
  showSheetMusic,
  onMidiSoundToggle, // New prop to handle MIDI sound toggling
  isMidiSoundEnabled // New prop to track MIDI sound state
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [displayTime, setDisplayTime] = useState(0); // For display purposes only
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false); // New state for tracking mute status
  const [progressPercent, setProgressPercent] = useState(0);
  const audioRef = useRef(null);
  const currentTimeRef = useRef(0); // Store current time in ref to avoid re-renders
  const seekingRef = useRef(false); // Track when user is manually seeking
  const animationFrameRef = useRef(null);
  const seekBarContainerRef = useRef(null);
  
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
    }
    
    // Only revoke URL if we created it
    return () => {
      if (audioUrl !== audioData) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioData]);
  
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
        
        // Only update display time (less frequent) to avoid re-renders
        setDisplayTime(time); 
        setProgressPercent((time / audioRef.current.duration) * 100);
        
        // Always report current time to parent for synchronization
        // even for small changes to ensure precise note visualization
        if (onTimeUpdate && (Math.abs(time - previousTime) > 0.01 || time !== previousTime)) {
          onTimeUpdate(time * 1000); // Convert to milliseconds for MIDI sync
        }
      }
      animationFrameRef.current = requestAnimationFrame(updateTime);
    };
    
    animationFrameRef.current = requestAnimationFrame(updateTime);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, onTimeUpdate]);
  
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
    seekingRef.current = true; // Set seeking flag to prevent update loop
    
    const seekTime = parseFloat(e.target.value);
    currentTimeRef.current = seekTime;
    setDisplayTime(seekTime);
    setProgressPercent((seekTime / duration) * 100);
    
    if (audioRef.current) {
      audioRef.current.currentTime = seekTime;
    }
    
    // Schedule the seeking flag to be released
    setTimeout(() => {
      seekingRef.current = false;
      // Update one more time after seeking ends
      if (onTimeUpdate) {
        onTimeUpdate(seekTime * 1000);
      }
    }, 50);
  };
  
  // Format time as mm:ss
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
          {isPlaying ? '❚❚' : '▶'}
        </button>
        
        {/* Add mute button */}
        <button
          className={`${styles.controlButton} ${isMuted ? styles.activeMute : ''}`}
          onClick={toggleMute}
          aria-label={isMuted ? 'Unmute' : 'Mute'}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          M
        </button>
        
        {/* New MIDI sound toggle button */}
        {onMidiSoundToggle && (
          <button
            className={`${styles.controlButton} ${!isMidiSoundEnabled ? styles.midiSoundDisabled : ''}`}
            onClick={handleMidiSoundToggle}
            aria-label={isMidiSoundEnabled ? 'Disable MIDI Sound' : 'Enable MIDI Sound'}
            title={isMidiSoundEnabled ? 'Disable MIDI Sound' : 'Enable MIDI Sound'}
          >
            {isMidiSoundEnabled ? '🎹' : '🔇'}
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
            {showSheetMusic ? '🎹' : '🎼'}
          </button>
        )}
      </div>
    </div>
  );
}