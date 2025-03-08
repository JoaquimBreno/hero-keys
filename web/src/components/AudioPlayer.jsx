// AudioPlayer.jsx
import React, { useState, useRef, useEffect } from 'react';
import styles from './AudioPlayer.module.css';

export default function AudioPlayer({ audioData, onTimeUpdate, fileName }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);
  
  // Initialize audio with the provided data
  useEffect(() => {
    if (audioData) {
      const audioBlob = new Blob([audioData], { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.load();
      }
      
      return () => URL.revokeObjectURL(audioUrl);
    }
  }, [audioData]);
  
  // Handle metadata loaded
  const handleMetadataLoaded = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };
  
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
  
  // Handle time update
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const time = audioRef.current.currentTime;
      setCurrentTime(time);
      
      // Report current time to parent component
      if (onTimeUpdate) {
        onTimeUpdate(time * 1000); // Convert to milliseconds for MIDI sync
        
        // Log current time for debugging
        console.log('Current playback time (ms):', time * 1000);
      }
    }
  };
  
  // Handle seek
  const handleSeek = (e) => {
    const seekTime = parseFloat(e.target.value);
    setCurrentTime(seekTime);
    
    if (audioRef.current) {
      audioRef.current.currentTime = seekTime;
      
      if (onTimeUpdate) {
        onTimeUpdate(seekTime * 1000);
      }
    }
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
        onTimeUpdate={handleTimeUpdate}
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
        
        <div className={styles.timeInfo}>
          <span className={styles.currentTime}>{formatTime(currentTime)}</span>
          
          <input
            type="range"
            className={styles.seekBar}
            min="0"
            max={duration || 0}
            step="0.01"
            value={currentTime}
            onChange={handleSeek}
          />
          
          <span className={styles.duration}>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}