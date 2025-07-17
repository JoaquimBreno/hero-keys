// AudioPlayer.jsx
import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import styles from './AudioPlayer.module.css';

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
  const audioRef = useRef(null);
  const currentTimeRef = useRef(0);
  const seekingRef = useRef(false);
  const animationFrameRef = useRef(null);
  const seekBarContainerRef = useRef(null);
  const onTimeUpdateRef = useRef(onTimeUpdate);

  // Update the ref when onTimeUpdate changes
  useEffect(() => {
    onTimeUpdateRef.current = onTimeUpdate;
  }, [onTimeUpdate]);
  
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
        if (onTimeUpdateRef.current && (Math.abs(time - previousTime) > 0.01 || time !== previousTime)) {
          onTimeUpdateRef.current(time * 1000); // Convert to milliseconds for MIDI sync
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
  }, [isPlaying]); // Removed onTimeUpdate from dependencies
  
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
        
        {/* Add toggle button for chord carousel if available */}
        {onChordCarouselToggle && (
          <button
            className={`${styles.toggleButton} ${showChordCarousel ? styles.chordsActive : ''}`}
            onClick={onChordCarouselToggle}
            aria-label={showChordCarousel ? 'Hide Chords' : 'Show Chords'}
            title={showChordCarousel ? 'Hide Chords' : 'Show Chords'}
          >
            {showChordCarousel ? 'C' : '🎵'}
          </button>
        )}
      </div>
    </div>
  );
});

export default AudioPlayer;