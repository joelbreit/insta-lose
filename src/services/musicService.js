// src/services/musicService.js

/**
 * Music Service - Abstraction layer for audio sources
 * 
 * This service provides a clean interface for music playback.
 * To switch from Suno to S3 (or any other source):
 * 1. Update the URLs in MUSIC_SOURCES
 * 2. Optionally adjust loadTrack() if you need different loading logic
 * 
 * No other code changes needed!
 */

// ============================================================================
// CONFIGURATION - This is the only section you'll need to change later
// ============================================================================

const MUSIC_SOURCES = {
  game: [
    // TODO: Replace these with your actual Suno CDN URLs
    // Format: 'https://cdn1.suno.ai/[track-id].mp3'
    'https://cdn1.suno.ai/9ef390af-66de-40a8-81a7-a54cba3ebfc9.m4a',
    'https://cdn1.suno.ai/3a5ddf73-d178-4c97-a326-92a82998be5d.m4a',
    'https://cdn1.suno.ai/168027c9-95ff-4c45-9dd4-c052f6231abf.m4a',
    // 'https://cdn1.suno.ai/8126db5a-78d4-4478-99e9-409cf44b89b9.m4a',
    'https://cdn1.suno.ai/683513e6-a765-4ffc-b89d-638da012f236.m4a',
    'https://cdn1.suno.ai/cd0c906a-3e59-4b5b-9445-7abe3f023463.m4a',
    'https://cdn1.suno.ai/0618f78f-4d28-4ea5-93bd-57cd9c2c811a.m4a',

  ],
  theme: 'https://cdn1.suno.ai/816631a0-62f4-478b-bd22-1875d93799ec.m4a',

  // Future: When moving to S3, just update URLs like this:
  // game: [
  //   'https://d1234abcd.cloudfront.net/music/game/ambient-1.mp3',
  //   'https://d1234abcd.cloudfront.net/music/game/ambient-2.mp3',
  // ],
  // theme: 'https://d1234abcd.cloudfront.net/music/theme/victory-theme.mp3',
};

const MUSIC_CONFIG = {
  gameVolume: 0.3,      // Background music volume (0-1)
  themeVolume: 0.5,     // Victory theme volume (0-1)
  fadeDuration: 2000,   // Fade out duration in ms
  fadeSteps: 20,        // Number of volume steps during fade
};

// ============================================================================
// SERVICE IMPLEMENTATION - No changes needed when switching sources
// ============================================================================

class MusicService {
  constructor() {
    this.currentAudio = null;
    this.currentTrackIndex = 0;
    this.isPlaying = false;
    this.fadeInterval = null;
  }

  /**
   * Load and return an Audio object for a given track
   * Override this method if you need custom loading logic for different sources
   */
  loadTrack(url) {
    const audio = new Audio(url);

    // Handle loading errors gracefully
    audio.addEventListener('error', (e) => {
      console.error('Failed to load audio track:', url, e);
    });

    return audio;
  }

  /**
   * Start playing background game music
   * @param {boolean} loop - Whether to loop the track
   * @returns {boolean} - Success status
   */
  async playGameMusic(loop = true) {
    try {
      // Stop any currently playing music
      this.stop();

      // Pick a random game track
      const tracks = MUSIC_SOURCES.game;
      this.currentTrackIndex = Math.floor(Math.random() * tracks.length);
      const trackUrl = tracks[this.currentTrackIndex];

      // Load and configure the audio
      this.currentAudio = this.loadTrack(trackUrl);
      this.currentAudio.loop = loop;
      this.currentAudio.volume = MUSIC_CONFIG.gameVolume;

      // Attempt to play (may fail due to autoplay policy)
      await this.currentAudio.play();
      this.isPlaying = true;

      console.log('Playing game music:', trackUrl);
      return true;
    } catch (error) {
      console.warn('Could not autoplay music (browser policy):', error.message);
      // This is expected on first load - user interaction required
      return false;
    }
  }

  /**
   * Play the next game track in sequence
   */
  async playNextGameTrack() {
    const tracks = MUSIC_SOURCES.game;
    this.currentTrackIndex = (this.currentTrackIndex + 1) % tracks.length;

    const trackUrl = tracks[this.currentTrackIndex];

    if (this.currentAudio) {
      this.currentAudio.src = trackUrl;
      this.currentAudio.loop = true;
      this.currentAudio.volume = MUSIC_CONFIG.gameVolume;

      try {
        await this.currentAudio.play();
        console.log('Playing next game track:', trackUrl);
      } catch (error) {
        console.error('Failed to play next track:', error);
      }
    }
  }

  /**
   * Fade out current music and play victory theme
   * @returns {Promise<void>}
   */
  async fadeToTheme() {
    return new Promise((resolve) => {
      if (!this.currentAudio || !this.isPlaying) {
        // No music playing, just start the theme
        this.playTheme();
        resolve();
        return;
      }

      console.log('Fading out game music...');

      const startVolume = this.currentAudio.volume;
      const volumeStep = startVolume / MUSIC_CONFIG.fadeSteps;
      const stepDuration = MUSIC_CONFIG.fadeDuration / MUSIC_CONFIG.fadeSteps;

      // Clear any existing fade interval
      if (this.fadeInterval) {
        clearInterval(this.fadeInterval);
      }

      let step = 0;
      this.fadeInterval = setInterval(() => {
        step++;
        const newVolume = Math.max(0, startVolume - (volumeStep * step));
        this.currentAudio.volume = newVolume;

        if (step >= MUSIC_CONFIG.fadeSteps || newVolume <= 0) {
          clearInterval(this.fadeInterval);
          this.fadeInterval = null;
          this.currentAudio.pause();
          this.currentAudio = null;
          this.isPlaying = false;

          console.log('Fade complete, starting theme...');
          this.playTheme();
          resolve();
        }
      }, stepDuration);
    });
  }

  /**
   * Play the victory theme song
   */
  async playTheme() {
    try {
      this.currentAudio = this.loadTrack(MUSIC_SOURCES.theme);
      this.currentAudio.loop = false; // Theme plays once
      this.currentAudio.volume = MUSIC_CONFIG.themeVolume;

      await this.currentAudio.play();
      this.isPlaying = true;

      console.log('Playing victory theme');
    } catch (error) {
      console.error('Failed to play theme:', error);
    }
  }

  /**
   * Stop all music immediately
   */
  stop() {
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }

    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }

    this.isPlaying = false;
  }

  /**
   * Pause current music (can be resumed)
   */
  pause() {
    if (this.currentAudio && this.isPlaying) {
      this.currentAudio.pause();
      this.isPlaying = false;
    }
  }

  /**
   * Resume paused music
   */
  async resume() {
    if (this.currentAudio && !this.isPlaying) {
      try {
        await this.currentAudio.play();
        this.isPlaying = true;
      } catch (error) {
        console.error('Failed to resume music:', error);
      }
    }
  }

  /**
   * Set volume for current track
   * @param {number} volume - Volume level (0-1)
   */
  setVolume(volume) {
    if (this.currentAudio) {
      this.currentAudio.volume = Math.max(0, Math.min(1, volume));
    }
  }

  /**
   * Get current playback status
   */
  getStatus() {
    return {
      isPlaying: this.isPlaying,
      currentTrackIndex: this.currentTrackIndex,
      hasAudio: !!this.currentAudio,
    };
  }
}

// Export singleton instance
export const musicService = new MusicService();

// Export for testing or advanced use cases
export { MusicService, MUSIC_SOURCES, MUSIC_CONFIG };
