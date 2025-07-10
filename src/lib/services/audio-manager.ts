// Audio Manager Service
// Handles volume ducking, normalization, and smooth transitions for ads and music

export interface AudioManagerConfig {
  musicVolume: number;
  adVolume: number;
  duckingVolume: number; // Volume level during ducking (0-1)
  transitionDuration: number; // Fade duration in milliseconds
  crossfadeDuration: number; // Crossfade duration in milliseconds
  sampleRate: number;
}

export interface AudioTrack {
  id: string;
  type: 'music' | 'voice' | 'ad' | 'effect';
  buffer: AudioBuffer;
  source?: AudioBufferSourceNode;
  gainNode?: GainNode;
  isPlaying: boolean;
  isPaused: boolean;
  startTime: number;
  pausedAt: number;
  duration: number;
  loop: boolean;
  volume: number;
  targetVolume: number;
}

export interface VolumeAnalysis {
  rms: number;
  peak: number;
  loudness: number; // LUFS approximation
  dynamicRange: number;
  recommendedGain: number;
}

export class AudioManager {
  private audioContext: AudioContext | null = null;
  private masterGainNode: GainNode | null = null;
  private musicGainNode: GainNode | null = null;
  private adGainNode: GainNode | null = null;
  private voiceGainNode: GainNode | null = null;
  private effectsGainNode: GainNode | null = null;
  
  private config: AudioManagerConfig;
  private tracks: Map<string, AudioTrack> = new Map();
  private fadeIntervals: Map<string, NodeJS.Timeout> = new Map();
  private isDucking: boolean = false;
  private originalMusicVolume: number = 0.7;
  
  constructor(config: AudioManagerConfig) {
    this.config = config;
    this.initializeAudioContext();
  }

  private initializeAudioContext(): void {
    if (typeof window !== 'undefined' && window.AudioContext) {
      this.audioContext = new AudioContext();
      this.setupAudioNodes();
    }
  }

  private setupAudioNodes(): void {
    if (!this.audioContext) return;

    // Create master gain node
    this.masterGainNode = this.audioContext.createGain();
    this.masterGainNode.connect(this.audioContext.destination);

    // Create category-specific gain nodes
    this.musicGainNode = this.audioContext.createGain();
    this.musicGainNode.connect(this.masterGainNode);
    this.musicGainNode.gain.value = this.config.musicVolume;

    this.adGainNode = this.audioContext.createGain();
    this.adGainNode.connect(this.masterGainNode);
    this.adGainNode.gain.value = this.config.adVolume;

    this.voiceGainNode = this.audioContext.createGain();
    this.voiceGainNode.connect(this.masterGainNode);
    this.voiceGainNode.gain.value = 0.8; // Voice at 80% by default

    this.effectsGainNode = this.audioContext.createGain();
    this.effectsGainNode.connect(this.masterGainNode);
    this.effectsGainNode.gain.value = 0.5; // Effects at 50% by default
  }

  // Analyze audio for volume normalization
  private analyzeAudio(audioBuffer: AudioBuffer): VolumeAnalysis {
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const duration = audioBuffer.duration;
    
    let sumSquares = 0;
    let peak = 0;
    let segments: number[] = [];
    
    // Calculate RMS and peak
    for (let i = 0; i < channelData.length; i++) {
      const sample = Math.abs(channelData[i]);
      sumSquares += sample * sample;
      peak = Math.max(peak, sample);
      
      // Segment for dynamic range analysis
      if (i % Math.floor(sampleRate * 0.1) === 0) { // 100ms segments
        segments.push(sample);
      }
    }
    
    const rms = Math.sqrt(sumSquares / channelData.length);
    
    // Calculate dynamic range (difference between loudest and quietest segments)
    const sortedSegments = segments.sort((a, b) => a - b);
    const q10 = sortedSegments[Math.floor(sortedSegments.length * 0.1)];
    const q90 = sortedSegments[Math.floor(sortedSegments.length * 0.9)];
    const dynamicRange = q90 - q10;
    
    // Approximate LUFS (simplified)
    const loudness = -23 + 20 * Math.log10(rms);
    
    // Calculate recommended gain to normalize to -16 LUFS
    const targetLoudness = -16;
    const recommendedGain = Math.pow(10, (targetLoudness - loudness) / 20);
    
    return {
      rms,
      peak,
      loudness,
      dynamicRange,
      recommendedGain: Math.min(recommendedGain, 4) // Limit gain to prevent distortion
    };
  }

  // Normalize audio buffer volume
  private normalizeAudioBuffer(audioBuffer: AudioBuffer, targetGain: number): AudioBuffer {
    if (!this.audioContext) return audioBuffer;
    
    const normalizedBuffer = this.audioContext.createBuffer(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );
    
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const inputData = audioBuffer.getChannelData(channel);
      const outputData = normalizedBuffer.getChannelData(channel);
      
      for (let i = 0; i < inputData.length; i++) {
        outputData[i] = inputData[i] * targetGain;
      }
    }
    
    return normalizedBuffer;
  }

  // Smooth volume transition
  private fadeVolume(
    gainNode: GainNode,
    targetVolume: number,
    duration: number,
    trackId?: string
  ): Promise<void> {
    return new Promise((resolve) => {
      if (!this.audioContext) {
        resolve();
        return;
      }

      // Clear existing fade for this track
      if (trackId) {
        const existingFade = this.fadeIntervals.get(trackId);
        if (existingFade) {
          clearInterval(existingFade);
        }
      }

      const startVolume = gainNode.gain.value;
      const volumeDifference = targetVolume - startVolume;
      const steps = Math.ceil(duration / 10); // 10ms steps
      const volumeStep = volumeDifference / steps;
      let currentStep = 0;

      const fadeInterval = setInterval(() => {
        currentStep++;
        const newVolume = startVolume + (volumeStep * currentStep);
        
        if (currentStep >= steps) {
          gainNode.gain.value = targetVolume;
          clearInterval(fadeInterval);
          if (trackId) {
            this.fadeIntervals.delete(trackId);
          }
          resolve();
        } else {
          gainNode.gain.value = newVolume;
        }
      }, 10);

      if (trackId) {
        this.fadeIntervals.set(trackId, fadeInterval);
      }
    });
  }

  // Duck music volume for ads
  public async duckMusic(): Promise<void> {
    if (!this.musicGainNode || this.isDucking) return;
    
    this.isDucking = true;
    this.originalMusicVolume = this.musicGainNode.gain.value;
    
    await this.fadeVolume(
      this.musicGainNode,
      this.config.duckingVolume,
      this.config.transitionDuration
    );
  }

  // Restore music volume after ads
  public async restoreMusic(): Promise<void> {
    if (!this.musicGainNode || !this.isDucking) return;
    
    await this.fadeVolume(
      this.musicGainNode,
      this.originalMusicVolume,
      this.config.transitionDuration
    );
    
    this.isDucking = false;
  }

  // Load and prepare audio track
  public async loadTrack(
    id: string,
    audioBuffer: AudioBuffer,
    type: AudioTrack['type'],
    options: {
      loop?: boolean;
      volume?: number;
      normalize?: boolean;
    } = {}
  ): Promise<AudioTrack> {
    if (!this.audioContext) {
      throw new Error('Audio context not available');
    }

    let processedBuffer = audioBuffer;
    
    // Normalize audio if requested
    if (options.normalize) {
      const analysis = this.analyzeAudio(audioBuffer);
      
      // Apply normalization for ads to ensure consistent volume
      if (type === 'ad') {
        processedBuffer = this.normalizeAudioBuffer(audioBuffer, analysis.recommendedGain);
      }
    }

    const track: AudioTrack = {
      id,
      type,
      buffer: processedBuffer,
      isPlaying: false,
      isPaused: false,
      startTime: 0,
      pausedAt: 0,
      duration: processedBuffer.duration,
      loop: options.loop || false,
      volume: options.volume || this.getDefaultVolumeForType(type),
      targetVolume: options.volume || this.getDefaultVolumeForType(type)
    };

    this.tracks.set(id, track);
    return track;
  }

  private getDefaultVolumeForType(type: AudioTrack['type']): number {
    switch (type) {
      case 'music': return this.config.musicVolume;
      case 'ad': return this.config.adVolume;
      case 'voice': return 0.8;
      case 'effect': return 0.5;
      default: return 0.7;
    }
  }

  private getGainNodeForType(type: AudioTrack['type']): GainNode | null {
    switch (type) {
      case 'music': return this.musicGainNode;
      case 'ad': return this.adGainNode;
      case 'voice': return this.voiceGainNode;
      case 'effect': return this.effectsGainNode;
      default: return this.masterGainNode;
    }
  }

  // Play audio track
  public async playTrack(
    id: string,
    options: {
      fadeIn?: boolean;
      fadeDuration?: number;
      offset?: number;
    } = {}
  ): Promise<void> {
    const track = this.tracks.get(id);
    if (!track || !this.audioContext) {
      throw new Error(`Track ${id} not found or audio context unavailable`);
    }

    if (track.isPlaying) {
      return; // Already playing
    }

    // Create audio source
    const source = this.audioContext.createBufferSource();
    source.buffer = track.buffer;
    source.loop = track.loop;

    // Create gain node for this track
    const gainNode = this.audioContext.createGain();
    const parentGainNode = this.getGainNodeForType(track.type);
    
    if (parentGainNode) {
      source.connect(gainNode);
      gainNode.connect(parentGainNode);
    } else {
      source.connect(gainNode);
      gainNode.connect(this.masterGainNode!);
    }

    // Set initial volume
    if (options.fadeIn) {
      gainNode.gain.value = 0;
      track.volume = 0;
    } else {
      gainNode.gain.value = track.targetVolume;
      track.volume = track.targetVolume;
    }

    // Handle ducking for ads
    if (track.type === 'ad') {
      await this.duckMusic();
    }

    // Start playback
    const startTime = this.audioContext.currentTime;
    const offset = options.offset || 0;
    
    source.start(startTime, offset);
    
    // Update track state
    track.source = source;
    track.gainNode = gainNode;
    track.isPlaying = true;
    track.isPaused = false;
    track.startTime = startTime;

    // Fade in if requested
    if (options.fadeIn) {
      await this.fadeVolume(
        gainNode,
        track.targetVolume,
        options.fadeDuration || this.config.transitionDuration,
        id
      );
    }

    // Handle track end
    source.onended = () => {
      this.onTrackEnded(id);
    };
  }

  // Stop audio track
  public async stopTrack(
    id: string,
    options: {
      fadeOut?: boolean;
      fadeDuration?: number;
    } = {}
  ): Promise<void> {
    const track = this.tracks.get(id);
    if (!track || !track.isPlaying) {
      return;
    }

    if (options.fadeOut && track.gainNode) {
      await this.fadeVolume(
        track.gainNode,
        0,
        options.fadeDuration || this.config.transitionDuration,
        id
      );
    }

    if (track.source) {
      track.source.stop();
    }

    // Restore music volume if this was an ad
    if (track.type === 'ad') {
      await this.restoreMusic();
    }

    this.onTrackEnded(id);
  }

  // Pause audio track
  public pauseTrack(id: string): void {
    const track = this.tracks.get(id);
    if (!track || !track.isPlaying || !this.audioContext) {
      return;
    }

    track.pausedAt = this.audioContext.currentTime - track.startTime;
    track.isPaused = true;
    
    if (track.source) {
      track.source.stop();
    }
  }

  // Resume audio track
  public async resumeTrack(id: string): Promise<void> {
    const track = this.tracks.get(id);
    if (!track || !track.isPaused) {
      return;
    }

    await this.playTrack(id, { offset: track.pausedAt });
    track.isPaused = false;
  }

  // Set track volume
  public async setTrackVolume(
    id: string,
    volume: number,
    fade: boolean = true
  ): Promise<void> {
    const track = this.tracks.get(id);
    if (!track || !track.gainNode) {
      return;
    }

    const clampedVolume = Math.max(0, Math.min(1, volume));
    track.targetVolume = clampedVolume;

    if (fade) {
      await this.fadeVolume(
        track.gainNode,
        clampedVolume,
        this.config.transitionDuration,
        id
      );
    } else {
      track.gainNode.gain.value = clampedVolume;
    }
    
    track.volume = clampedVolume;
  }

  // Set master volume
  public setMasterVolume(volume: number): void {
    if (!this.masterGainNode) return;
    
    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.masterGainNode.gain.value = clampedVolume;
  }

  // Set category volume
  public setCategoryVolume(
    category: 'music' | 'ad' | 'voice' | 'effects',
    volume: number
  ): void {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    
    switch (category) {
      case 'music':
        if (this.musicGainNode) {
          this.musicGainNode.gain.value = clampedVolume;
          this.config.musicVolume = clampedVolume;
        }
        break;
      case 'ad':
        if (this.adGainNode) {
          this.adGainNode.gain.value = clampedVolume;
          this.config.adVolume = clampedVolume;
        }
        break;
      case 'voice':
        if (this.voiceGainNode) {
          this.voiceGainNode.gain.value = clampedVolume;
        }
        break;
      case 'effects':
        if (this.effectsGainNode) {
          this.effectsGainNode.gain.value = clampedVolume;
        }
        break;
    }
  }

  // Crossfade between tracks
  public async crossfade(
    fromTrackId: string,
    toTrackId: string,
    duration: number = this.config.crossfadeDuration
  ): Promise<void> {
    const fromTrack = this.tracks.get(fromTrackId);
    const toTrack = this.tracks.get(toTrackId);
    
    if (!fromTrack || !toTrack) {
      throw new Error('One or both tracks not found for crossfade');
    }

    // Start the new track at zero volume
    await this.playTrack(toTrackId, { fadeIn: false });
    if (toTrack.gainNode) {
      toTrack.gainNode.gain.value = 0;
    }

    // Crossfade
    const fadePromises = [];
    
    if (fromTrack.gainNode) {
      fadePromises.push(this.fadeVolume(fromTrack.gainNode, 0, duration, fromTrackId));
    }
    
    if (toTrack.gainNode) {
      fadePromises.push(this.fadeVolume(toTrack.gainNode, toTrack.targetVolume, duration, toTrackId));
    }

    await Promise.all(fadePromises);
    
    // Stop the old track
    await this.stopTrack(fromTrackId);
  }

  // Get track info
  public getTrackInfo(id: string): AudioTrack | null {
    const track = this.tracks.get(id);
    return track ? { ...track } : null;
  }

  // Get current playback position
  public getTrackPosition(id: string): number {
    const track = this.tracks.get(id);
    if (!track || !this.audioContext) return 0;
    
    if (track.isPaused) {
      return track.pausedAt;
    }
    
    if (track.isPlaying) {
      return this.audioContext.currentTime - track.startTime;
    }
    
    return 0;
  }

  // Handle track ended
  private onTrackEnded(id: string): void {
    const track = this.tracks.get(id);
    if (!track) return;
    
    track.isPlaying = false;
    track.isPaused = false;
    track.source = undefined;
    track.gainNode = undefined;
    
    // Restore music volume if this was an ad
    if (track.type === 'ad') {
      this.restoreMusic();
    }
  }

  // Remove track from memory
  public removeTrack(id: string): void {
    const track = this.tracks.get(id);
    if (track && track.isPlaying) {
      this.stopTrack(id);
    }
    this.tracks.delete(id);
  }

  // Get all tracks
  public getAllTracks(): AudioTrack[] {
    return Array.from(this.tracks.values());
  }

  // Update configuration
  public updateConfig(newConfig: Partial<AudioManagerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Cleanup
  public dispose(): void {
    // Stop all tracks
    for (const [id] of this.tracks) {
      this.stopTrack(id);
    }
    
    // Clear all fade intervals
    for (const [, interval] of this.fadeIntervals) {
      clearInterval(interval);
    }
    this.fadeIntervals.clear();
    
    // Clear tracks
    this.tracks.clear();
    
    // Close audio context
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// Factory function to create audio manager
export function createAudioManager(config: Partial<AudioManagerConfig> = {}): AudioManager {
  const defaultConfig: AudioManagerConfig = {
    musicVolume: 0.7,
    adVolume: 0.7,
    duckingVolume: 0.2, // Duck music to 20% during ads
    transitionDuration: 500, // 500ms fade transitions
    crossfadeDuration: 1000, // 1 second crossfades
    sampleRate: 44100
  };

  return new AudioManager({ ...defaultConfig, ...config });
}

// Helper function to load audio from URL
export async function loadAudioFromUrl(url: string): Promise<AudioBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load audio: ${response.status}`);
  }
  
  const audioData = await response.arrayBuffer();
  const audioContext = new AudioContext();
  
  try {
    return await audioContext.decodeAudioData(audioData);
  } finally {
    await audioContext.close();
  }
} 