// Ad Engine Service
// Handles VAST XML parsing and ad scheduling for free tier users

export interface AdConfig {
  vastTagUrl: string;
  intervalSeconds: number;
  volumeLevel: number;
  maxRetries: number;
  timeoutMs: number;
}

export interface VASTAd {
  id: string;
  title: string;
  description: string;
  duration: number; // seconds
  mediaUrl: string;
  clickThroughUrl?: string;
  impressionUrls: string[];
  trackingUrls: {
    start?: string[];
    firstQuartile?: string[];
    midpoint?: string[];
    thirdQuartile?: string[];
    complete?: string[];
    click?: string[];
  };
  skipOffset?: number; // seconds until skip is available
  companionAds?: {
    width: number;
    height: number;
    resourceUrl: string;
    clickThroughUrl?: string;
  }[];
}

export interface AdPlaybackState {
  isPlaying: boolean;
  isLoading: boolean;
  currentAd: VASTAd | null;
  progress: number; // 0-1
  canSkip: boolean;
  volume: number;
  error: string | null;
  nextAdScheduledAt: Date | null;
}

export interface AdImpressionData {
  adId: string;
  userId: string;
  timestamp: Date;
  duration: number;
  completed: boolean;
  skipped: boolean;
  clickedThrough: boolean;
  userAgent: string;
  ipAddress?: string;
}

export class AdEngine {
  private config: AdConfig;
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private currentAudioSource: AudioBufferSourceNode | null = null;
  private adTimer: NodeJS.Timeout | null = null;
  private state: AdPlaybackState = {
    isPlaying: false,
    isLoading: false,
    currentAd: null,
    progress: 0,
    canSkip: false,
    volume: 0.7,
    error: null,
    nextAdScheduledAt: null
  };

  constructor(config: AdConfig) {
    this.config = config;
    this.initializeAudioContext();
    this.scheduleNextAd();
  }

  private initializeAudioContext(): void {
    if (typeof window !== 'undefined' && window.AudioContext) {
      this.audioContext = new AudioContext();
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
      this.gainNode.gain.value = this.config.volumeLevel;
    }
  }

  // Parse VAST XML response
  private async parseVASTXML(xmlText: string): Promise<VASTAd | null> {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlText, 'text/xml');
      
      // Check for XML parsing errors
      const parseError = doc.querySelector('parsererror');
      if (parseError) {
        throw new Error('Invalid XML format');
      }

      const ad = doc.querySelector('Ad');
      if (!ad) {
        throw new Error('No Ad element found in VAST XML');
      }

      const creative = ad.querySelector('Creative');
      const linear = creative?.querySelector('Linear');
      
      if (!linear) {
        throw new Error('No Linear creative found in VAST XML');
      }

      // Extract media file
      const mediaFile = linear.querySelector('MediaFile');
      if (!mediaFile) {
        throw new Error('No MediaFile found in VAST XML');
      }

      const mediaUrl = mediaFile.textContent?.trim();
      if (!mediaUrl) {
        throw new Error('MediaFile URL is empty');
      }

      // Extract duration
      const durationText = linear.getAttribute('duration') || '0:00:30';
      const duration = this.parseDuration(durationText);

      // Extract tracking URLs
      const trackingEvents = linear.querySelectorAll('TrackingEvent');
      const trackingUrls: VASTAd['trackingUrls'] = {};
      
      trackingEvents.forEach(event => {
        const eventType = event.getAttribute('event');
        const url = event.textContent?.trim();
        
        if (eventType && url) {
          if (!trackingUrls[eventType as keyof VASTAd['trackingUrls']]) {
            trackingUrls[eventType as keyof VASTAd['trackingUrls']] = [];
          }
          trackingUrls[eventType as keyof VASTAd['trackingUrls']]!.push(url);
        }
      });

      // Extract impression URLs
      const impressionNodes = ad.querySelectorAll('Impression');
      const impressionUrls: string[] = [];
      impressionNodes.forEach(node => {
        const url = node.textContent?.trim();
        if (url) impressionUrls.push(url);
      });

      // Extract click-through URL
      const clickThrough = linear.querySelector('ClickThrough');
      const clickThroughUrl = clickThrough?.textContent?.trim();

      // Extract skip offset
      const skipOffset = linear.getAttribute('skipoffset') 
        ? this.parseDuration(linear.getAttribute('skipoffset')!) 
        : undefined;

      return {
        id: ad.getAttribute('id') || `ad-${Date.now()}`,
        title: ad.querySelector('AdTitle')?.textContent?.trim() || 'Advertisement',
        description: ad.querySelector('Description')?.textContent?.trim() || '',
        duration,
        mediaUrl,
        clickThroughUrl,
        impressionUrls,
        trackingUrls,
        skipOffset,
        companionAds: this.extractCompanionAds(ad)
      };

    } catch (error) {
      console.error('Failed to parse VAST XML:', error);
      return null;
    }
  }

  private parseDuration(duration: string): number {
    // Parse duration in format HH:MM:SS or MM:SS
    const parts = duration.split(':').map(p => parseInt(p, 10));
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    return 30; // default 30 seconds
  }

  private extractCompanionAds(ad: Element): VASTAd['companionAds'] {
    const companions = ad.querySelectorAll('Companion');
    const companionAds: VASTAd['companionAds'] = [];

    companions.forEach(companion => {
      const width = parseInt(companion.getAttribute('width') || '0', 10);
      const height = parseInt(companion.getAttribute('height') || '0', 10);
      const staticResource = companion.querySelector('StaticResource');
      const clickThrough = companion.querySelector('CompanionClickThrough');

      if (staticResource && width && height) {
        companionAds.push({
          width,
          height,
          resourceUrl: staticResource.textContent?.trim() || '',
          clickThroughUrl: clickThrough?.textContent?.trim()
        });
      }
    });

    return companionAds;
  }

  // Fetch ad from VAST tag
  private async fetchAd(): Promise<VASTAd | null> {
    try {
      const response = await fetch(this.config.vastTagUrl, {
        method: 'GET',
        headers: {
          'User-Agent': navigator.userAgent,
          'Accept': 'application/xml, text/xml'
        },
        signal: AbortSignal.timeout(this.config.timeoutMs)
      });

      if (!response.ok) {
        throw new Error(`VAST request failed: ${response.status}`);
      }

      const xmlText = await response.text();
      return await this.parseVASTXML(xmlText);

    } catch (error) {
      console.error('Failed to fetch ad:', error);
      return null;
    }
  }

  // Load and prepare ad audio
  private async loadAdAudio(mediaUrl: string): Promise<AudioBuffer | null> {
    if (!this.audioContext) {
      return null;
    }

    try {
      const response = await fetch(mediaUrl);
      if (!response.ok) {
        throw new Error(`Failed to load audio: ${response.status}`);
      }

      const audioData = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(audioData);
      
      return audioBuffer;

    } catch (error) {
      console.error('Failed to load ad audio:', error);
      return null;
    }
  }

  // Play ad with volume normalization
  private async playAdAudio(audioBuffer: AudioBuffer): Promise<void> {
    if (!this.audioContext || !this.gainNode) {
      return;
    }

    // Stop any currently playing audio
    if (this.currentAudioSource) {
      this.currentAudioSource.stop();
    }

    // Create new audio source
    this.currentAudioSource = this.audioContext.createBufferSource();
    this.currentAudioSource.buffer = audioBuffer;
    this.currentAudioSource.connect(this.gainNode);

    // Set volume level
    this.gainNode.gain.value = this.config.volumeLevel;

    // Track playback progress
    const startTime = this.audioContext.currentTime;
    const duration = audioBuffer.duration;
    
    const progressTimer = setInterval(() => {
      const elapsed = this.audioContext!.currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      this.updateState({ progress });
      
      // Check if skip is available
      if (this.state.currentAd?.skipOffset && elapsed >= this.state.currentAd.skipOffset) {
        this.updateState({ canSkip: true });
      }
      
      if (progress >= 1) {
        clearInterval(progressTimer);
        this.onAdComplete();
      }
    }, 100);

    // Handle audio end
    this.currentAudioSource.onended = () => {
      clearInterval(progressTimer);
      this.onAdComplete();
    };

    // Start playback
    this.currentAudioSource.start();
    this.fireTrackingPixels('start');
  }

  // Fire tracking pixels
  private fireTrackingPixels(event: keyof VASTAd['trackingUrls']): void {
    if (!this.state.currentAd) return;

    const urls = this.state.currentAd.trackingUrls[event];
    if (!urls || urls.length === 0) return;

    urls.forEach(url => {
      // Use image loading to fire pixel (doesn't trigger CORS)
      const img = new Image();
      img.onload = () => console.log(`Tracking pixel fired: ${event}`);
      img.onerror = () => console.warn(`Tracking pixel failed: ${url}`);
      img.src = url;
    });
  }

  // Update internal state
  private updateState(updates: Partial<AdPlaybackState>): void {
    this.state = { ...this.state, ...updates };
  }

  // Handle ad completion
  private onAdComplete(): void {
    this.fireTrackingPixels('complete');
    this.updateState({
      isPlaying: false,
      currentAd: null,
      progress: 0,
      canSkip: false
    });
    
    // Schedule next ad
    this.scheduleNextAd();
  }

  // Schedule next ad based on interval
  private scheduleNextAd(): void {
    if (this.adTimer) {
      clearTimeout(this.adTimer);
    }

    const nextAdTime = new Date(Date.now() + this.config.intervalSeconds * 1000);
    this.updateState({ nextAdScheduledAt: nextAdTime });

    this.adTimer = setTimeout(() => {
      this.playNextAd();
    }, this.config.intervalSeconds * 1000);
  }

  // Main ad playback method
  public async playNextAd(): Promise<void> {
    if (this.state.isPlaying || this.state.isLoading) {
      return;
    }

    this.updateState({ isLoading: true, error: null });

    try {
      const ad = await this.fetchAd();
      if (!ad) {
        throw new Error('No ad available');
      }

      this.updateState({ currentAd: ad });

      // Fire impression pixels
      ad.impressionUrls.forEach(url => {
        const img = new Image();
        img.src = url;
      });

      // Load and play audio
      const audioBuffer = await this.loadAdAudio(ad.mediaUrl);
      if (!audioBuffer) {
        throw new Error('Failed to load ad audio');
      }

      this.updateState({ isPlaying: true, isLoading: false });
      await this.playAdAudio(audioBuffer);

    } catch (error) {
      console.error('Ad playback failed:', error);
      this.updateState({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Ad playback failed'
      });
      
      // Schedule next ad even if current one failed
      this.scheduleNextAd();
    }
  }

  // Skip current ad
  public skipAd(): void {
    if (!this.state.canSkip || !this.state.isPlaying) {
      return;
    }

    if (this.currentAudioSource) {
      this.currentAudioSource.stop();
    }

    this.fireTrackingPixels('skip' as keyof VASTAd['trackingUrls']);
    this.onAdComplete();
  }

  // Handle ad click
  public clickAd(): void {
    if (!this.state.currentAd || !this.state.currentAd.clickThroughUrl) {
      return;
    }

    this.fireTrackingPixels('click');
    window.open(this.state.currentAd.clickThroughUrl, '_blank');
  }

  // Get current state
  public getState(): AdPlaybackState {
    return { ...this.state };
  }

  // Set volume
  public setVolume(volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.config.volumeLevel = clampedVolume;
    this.updateState({ volume: clampedVolume });
    
    if (this.gainNode) {
      this.gainNode.gain.value = clampedVolume;
    }
  }

  // Update configuration
  public updateConfig(newConfig: Partial<AdConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Reschedule if interval changed
    if (newConfig.intervalSeconds) {
      this.scheduleNextAd();
    }
  }

  // Stop ad engine
  public stop(): void {
    if (this.adTimer) {
      clearTimeout(this.adTimer);
      this.adTimer = null;
    }

    if (this.currentAudioSource) {
      this.currentAudioSource.stop();
      this.currentAudioSource = null;
    }

    this.updateState({
      isPlaying: false,
      isLoading: false,
      currentAd: null,
      progress: 0,
      canSkip: false,
      error: null,
      nextAdScheduledAt: null
    });
  }

  // Cleanup
  public dispose(): void {
    this.stop();
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// Factory function to create ad engine with environment config
export function createAdEngine(env: any): AdEngine {
  const config: AdConfig = {
    vastTagUrl: env.VAST_TAG_URL || 'https://example.com/vast.xml',
    intervalSeconds: parseInt(env.AD_INTERVAL_SECONDS || '600', 10), // 10 minutes
    volumeLevel: parseFloat(env.AD_VOLUME_LEVEL || '0.7'),
    maxRetries: 3,
    timeoutMs: 10000
  };

  return new AdEngine(config);
}

// Helper function to check if user should see ads
export function shouldShowAds(userPlan: 'free' | 'pro'): boolean {
  return userPlan === 'free';
}

// Ad impression tracking for analytics
export async function trackAdImpression(data: AdImpressionData): Promise<void> {
  try {
    await fetch('/api/v1/analytics/ad-impression', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
  } catch (error) {
    console.error('Failed to track ad impression:', error);
  }
} 