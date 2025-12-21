// src/hooks/useMusic.js

import { useEffect, useRef, useState } from 'react';
import { musicService } from '../services/musicService';

/**
 * React hook for music playback control
 * 
 * Usage:
 *   const { playGameMusic, fadeToTheme, stop, isPlaying } = useMusic();
 * 
 * This hook provides a React-friendly interface to the music service.
 * All the source URL management is handled in musicService.js
 */
export function useMusic() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [status, setStatus] = useState({
    isPlaying: false,
    currentTrackIndex: 0,
    hasAudio: false,
  });

  // Use ref to avoid recreating functions on every render
  const serviceRef = useRef(musicService);

  // Update status periodically
  useEffect(() => {
    const updateStatus = () => {
      const newStatus = serviceRef.current.getStatus();
      setStatus(newStatus);
      setIsPlaying(newStatus.isPlaying);
    };

    // Check status every 500ms
    const interval = setInterval(updateStatus, 500);
    updateStatus(); // Initial check

    return () => clearInterval(interval);
  }, []);

  /**
   * Start playing background game music
   * This may fail on first load due to browser autoplay policies.
   * If it fails, music will start on next user interaction.
   */
  const playGameMusic = async () => {
    const success = await serviceRef.current.playGameMusic();
    if (!success) {
      console.log('Music will start on next user interaction');
    }
    return success;
  };

  /**
   * Play the next game track in the rotation
   */
  const playNextTrack = async () => {
    await serviceRef.current.playNextGameTrack();
  };

  /**
   * Fade out current music and start victory theme
   */
  const fadeToTheme = async () => {
    await serviceRef.current.fadeToTheme();
  };

  /**
   * Stop all music immediately
   */
  const stop = () => {
    serviceRef.current.stop();
  };

  /**
   * Pause current music (can be resumed)
   */
  const pause = () => {
    serviceRef.current.pause();
  };

  /**
   * Resume paused music
   */
  const resume = async () => {
    await serviceRef.current.resume();
  };

  /**
   * Set volume (0-1)
   */
  const setVolume = (volume) => {
    serviceRef.current.setVolume(volume);
  };

  /**
   * Play the theme immediately without fade
   */
  const playTheme = async () => {
    await serviceRef.current.playTheme();
  };

  return {
    // Playback controls
    playGameMusic,
    playNextTrack,
    fadeToTheme,
    playTheme,
    stop,
    pause,
    resume,
    setVolume,

    // Status
    isPlaying,
    status,
  };
}

/**
 * Hook for managing music in the game screen
 * Provides music controls and cleans up when unmounted
 * 
 * Usage:
 *   const { isPlaying, playGameMusic, stop } = useGameMusic();
 */
export function useGameMusic() {
  const { playGameMusic, stop, isPlaying } = useMusic();

  useEffect(() => {
    // Stop music when component unmounts
    return () => {
      stop();
    };
  }, []);

  return {
    isPlaying,
    playGameMusic,
    stop,
  };
}

/**
 * Hook for the game end/recap screen
 * Handles the fade-to-theme transition
 * 
 * Usage:
 *   useGameEndMusic(); // Automatically fades to theme
 */
export function useGameEndMusic() {
  const { fadeToTheme, stop } = useMusic();
  const hasTriggered = useRef(false);

  useEffect(() => {
    // Only trigger fade once
    if (!hasTriggered.current) {
      hasTriggered.current = true;
      fadeToTheme();
    }

    // Stop music when leaving recap screen
    return () => {
      stop();
    };
  }, []);
}
