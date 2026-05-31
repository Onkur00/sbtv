/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { PlaybackQuality, EnhancedChannel } from '../types.ts';
import { playBeep } from '../utils/beep.ts';
import { Play, Pause, Volume2, VolumeX, Settings, Maximize2, Minimize2 } from 'lucide-react';
import { FullscreenChannelPanel } from './FullscreenChannelPanel.tsx';

interface VideoPlayerProps {
  url: string | null;
  channelName: string;
  onVideoRef: (el: HTMLVideoElement | null) => void;
  playbackQuality: PlaybackQuality;
  setPlaybackQuality: (q: PlaybackQuality) => void;
  viewerCount: number;
  filteredChannels: EnhancedChannel[];
  activeChannelUrl: string | null;
  onSelectChannel: (url: string, name: string) => void;
  isFullscreenPanelOpen: boolean;
  setIsFullscreenPanelOpen: (open: boolean) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  url,
  channelName,
  onVideoRef,
  playbackQuality,
  setPlaybackQuality,
  viewerCount,
  filteredChannels,
  activeChannelUrl,
  onSelectChannel,
  isFullscreenPanelOpen,
  setIsFullscreenPanelOpen,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [hasQualityLevels, setHasQualityLevels] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const MAX_RETRIES = 3;

  // Custom controller states
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPseudoFullscreen, setIsPseudoFullscreen] = useState(false);
  const [isMobilePortrait, setIsMobilePortrait] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const checkOrientation = () => {
      const isMobile = window.innerWidth < 1024 || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
      const isPortrait = window.innerHeight > window.innerWidth;
      setIsMobilePortrait(isMobile && isPortrait);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  // Listen to first physical user interaction to unmute the video player
  useEffect(() => {
    const handleFirstInteraction = () => {
      setIsMuted(false);
      const videoEl = videoRef.current;
      if (videoEl) {
        videoEl.muted = false;
        videoEl.play().catch(() => {});
      }
    };
    document.body.addEventListener('click', handleFirstInteraction, { once: true, passive: true });
    document.body.addEventListener('keydown', handleFirstInteraction, { once: true, passive: true });
    document.body.addEventListener('pointerdown', handleFirstInteraction, { once: true, passive: true });
    return () => {
      document.body.removeEventListener('click', handleFirstInteraction);
      document.body.removeEventListener('keydown', handleFirstInteraction);
      document.body.removeEventListener('pointerdown', handleFirstInteraction);
    };
  }, []);

  const triggerControlsActivity = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      window.clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = window.setTimeout(() => {
      const activeEl = document.activeElement;
      const isControlFocused = activeEl && (
        activeEl.id === 'playPauseBtn' || 
        activeEl.id === 'qualityBtn' || 
        activeEl.id === 'fsToggleBtn' || 
        activeEl.classList.contains('quality-opt-btn')
      );
      if (videoRef.current && !videoRef.current.paused && !showQualityMenu && !isControlFocused) {
        setShowControls(false);
      }
    }, 3500) as unknown as number;
  }, [showQualityMenu]);

  useEffect(() => {
    triggerControlsActivity();
    return () => {
      if (controlsTimeoutRef.current) {
        window.clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying, showQualityMenu, triggerControlsActivity]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const activeFS = !!document.fullscreenElement;
      setIsFullscreen(activeFS);
      if (!activeFS) {
        setIsPseudoFullscreen(false);
        if (screen.orientation && typeof (screen.orientation as any).unlock === 'function') {
          try {
            (screen.orientation as any).unlock();
          } catch (e) {
            console.log("Orientation unlock failed:", e);
          }
        }
      } else {
        if (screen.orientation && typeof (screen.orientation as any).lock === 'function') {
          try {
            (screen.orientation as any).lock('landscape').catch((e: any) => {
              console.log("Orientation lock failed:", e);
            });
          } catch (e) {
            console.log("Orientation lock failed:", e);
          }
        }
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPseudoFullscreen) {
        setIsPseudoFullscreen(false);
      }
      // Wake up the player controls on arrow keys, enter, space, escape, backspace
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' ', 'Escape', 'Backspace'].includes(e.key)) {
        triggerControlsActivity();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPseudoFullscreen, triggerControlsActivity]);

  useEffect(() => {
    onVideoRef(videoRef.current);
    return () => {
      onVideoRef(null);
    };
  }, [onVideoRef]);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (videoEl) {
      videoEl.volume = volume;
      videoEl.muted = isMuted;
    }
  }, [volume, isMuted, url]);

  // Clean and start streaming whenever channel url changes
  useEffect(() => {
    if (!url) return;
    
    // Reset previous states
    setRetryCount(0);
    setStatusMessage('');
    setHasQualityLevels(false);

    const videoEl = videoRef.current;
    if (!videoEl) return;

    // Destroy duplicate/old hls logic
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    videoEl.pause();
    videoEl.removeAttribute('src');
    videoEl.load();

    const loadStream = () => {
      // 1. Native HLS support check (mainly Safari or iPhone)
      if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
        videoEl.src = url;
        videoEl.play().catch(err => {
          if (err.name !== "NotAllowedError" && err.name !== "AbortError") {
            console.warn("Playback interrupted or delayed:", err);
          }
        });
      } 
      // 2. Play using hls.js (standard browser)
      else if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 30,
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          startFragPrefetch: true,
          testBandwidth: true,
          fragLoadingMaxRetry: 6,
          manifestLoadingMaxRetry: 6,
          liveSyncDurationCount: 3,
        });

        hlsRef.current = hls;
        hls.loadSource(url);
        hls.attachMedia(videoEl);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          const levels = hls.levels;
          if (levels && levels.length > 1) {
            setHasQualityLevels(true);
            applyQualityToHls(hls, playbackQuality, levels.length);
          } else {
            setHasQualityLevels(false);
          }
          videoEl.play().catch(() => {
            // Mute and overlay play trigger if browser blocks autoplay
            videoEl.muted = true;
            videoEl.play().catch(err => console.warn("Muted autoplay blocked:", err));
          });
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              setRetryCount(prev => {
                const updated = prev + 1;
                if (updated <= MAX_RETRIES) {
                  setStatusMessage(`⚠️ Connection error. Retry ${updated}/${MAX_RETRIES}...`);
                  setTimeout(() => {
                    loadStream();
                  }, 2500);
                } else {
                  setStatusMessage(`❌ Live feed offline. Please try another channel.`);
                }
                return updated;
              });
            } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              // Silently recover standard audio/video sync anomalies without warning overlays
              hls.recoverMediaError();
            } else {
              setStatusMessage(`❌ Error streaming channel. Please select another.`);
              if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
              }
            }
          }
        });
      } else {
        // Fallback natively to source element
        videoEl.src = url;
        videoEl.play().catch(() => {
          setStatusMessage("❌ HLS is not supported in this browser.");
        });
      }
    };

    loadStream();

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [url]);

  // Apply playback quality changes to active HLS container
  useEffect(() => {
    const hls = hlsRef.current;
    if (hls && hls.levels && hls.levels.length > 1) {
      applyQualityToHls(hls, playbackQuality, hls.levels.length);
    }
  }, [playbackQuality]);

  const applyQualityToHls = (hls: Hls, quality: PlaybackQuality, levelsCount: number) => {
    try {
      if (quality === 'auto') {
        hls.autoLevelCapping = -1;
        hls.currentLevel = -1;
        hls.nextLevel = -1;
        hls.loadLevel = -1;
      } else {
        let targetLevel = -1;
        if (quality === 'high') {
          targetLevel = levelsCount - 1;
        } else if (quality === 'medium') {
          targetLevel = Math.max(0, Math.floor(levelsCount * 0.6));
        } else if (quality === 'low') {
          targetLevel = Math.max(0, Math.floor(levelsCount * 0.3));
        }

        if (targetLevel >= 0 && targetLevel < levelsCount) {
          // Force override on all level controls to switch immediately and lock the quality
          hls.currentLevel = targetLevel;
          hls.nextLevel = targetLevel;
          hls.loadLevel = targetLevel;
        }
      }
    } catch (err) {
      console.error("Error applying quality level:", err);
    }
  };

  const selectQuality = (q: PlaybackQuality) => {
    playBeep('select');
    setPlaybackQuality(q);
    setShowQualityMenu(false);
  };

  const togglePlay = () => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    playBeep('select');
    if (videoEl.paused) {
      videoEl.play().catch(err => console.warn("Play trigger delayed:", err));
      setIsPlaying(true);
    } else {
      videoEl.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    playBeep('select');
    const nextMuted = !isMuted;
    videoEl.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const toggleFullscreen = () => {
    playBeep('select');
    const container = document.getElementById('videoPlayerOuterContainer');
    if (!container) return;

    if (!document.fullscreenElement && !isPseudoFullscreen) {
      container.requestFullscreen?.()
        .then(() => {
          setIsFullscreen(true);
          if (screen.orientation && typeof (screen.orientation as any).lock === 'function') {
            try {
              (screen.orientation as any).lock('landscape').catch(() => {});
            } catch (e) {}
          }
        })
        .catch(() => {
          const videoEl = videoRef.current;
          if (videoEl) {
            (videoEl as any).webkitRequestFullscreen?.() || videoEl.requestFullscreen?.();
          }
        });
      setIsPseudoFullscreen(true);

      // Attempt immediate lock for devices supporting orientation locks
      if (screen.orientation && typeof (screen.orientation as any).lock === 'function') {
        try {
          (screen.orientation as any).lock('landscape').catch(() => {});
        } catch (e) {}
      }
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      }
      if (screen.orientation && typeof (screen.orientation as any).unlock === 'function') {
        try {
          (screen.orientation as any).unlock();
        } catch (e) {}
      }
      setIsFullscreen(false);
      setIsPseudoFullscreen(false);
    }
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    const targetTime = parseFloat(e.target.value);
    videoEl.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const isLive = !isFinite(duration) || duration === 0;
  const percent = duration > 0 ? (currentTime / duration) * 100 : 100;

  return (
    <section className="bg-slate-950 flex justify-center py-1.5 px-4 select-none">
      <div 
        id="videoPlayerOuterContainer"
        className={`w-full max-w-sm sm:max-w-md md:max-w-xl lg:max-w-[640px] bg-slate-950/80 rounded-2xl p-1 shadow-2xl relative border border-slate-800 transition-all duration-300 ${
          isFullscreen || isPseudoFullscreen 
            ? isMobilePortrait
              ? 'fixed z-[100] top-1/2 left-1/2 origin-center shadow-2xl overflow-hidden'
              : '!max-w-none !p-0 !border-0 !rounded-none fixed inset-0 z-[100] w-screen h-screen' 
            : ''
        }`}
        style={
          (isFullscreen || isPseudoFullscreen) && isMobilePortrait
            ? {
                width: '100vh',
                height: '100vw',
                transform: 'translate(-50%, -50%) rotate(90deg)',
              }
            : undefined
        }
      >
        <div 
          id="videoContainer" 
          className={`rounded-xl overflow-hidden aspect-video bg-black relative group/player w-full h-full transition-all duration-300 ${
            isFullscreen || isPseudoFullscreen ? '!rounded-none !aspect-none' : ''
          }`}
          onMouseMove={triggerControlsActivity}
          onMouseLeave={() => isPlaying && setShowControls(false)}
        >
          {/* Main Video Element */}
          <video
            id="liveVideo"
            ref={videoRef}
            controls={false}
            autoPlay
            playsInline
            muted={isMuted}
            onClick={triggerControlsActivity}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onDurationChange={(e) => setDuration(e.currentTarget.duration || 0)}
            onVolumeChange={(e) => setIsMuted(e.currentTarget.muted)}
            onLoadedMetadata={(e) => {
              setDuration(e.currentTarget.duration || 0);
              setIsMuted(e.currentTarget.muted);
              setIsPlaying(!e.currentTarget.paused);
            }}
            className="w-full h-full object-contain block"
            poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 9'%3E%3Crect width='100%25' height='100%25' fill='%23000'/%3E%3C/svg%3E"
          />

          {/* Centered Play Button when paused */}
          {!isPlaying && (
            <div 
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              className="absolute inset-0 flex items-center justify-center bg-black/20 cursor-pointer transition-all duration-300 z-10"
            >
              <div className="w-14 h-14 rounded-full bg-white/75 backdrop-blur-md flex items-center justify-center shadow-xl transform transition-transform duration-300 hover:scale-110">
                <Play className="w-5 h-5 text-black fill-black ml-1" />
              </div>
            </div>
          )}

          {/* Simulated Viewer occupancy status */}
          {url && (
            <div 
              id="viewerBadge" 
              className="absolute top-2.5 left-3 bg-black/70 backdrop-blur-md px-2.5 py-0.5 rounded-full text-xs font-bold text-yellow-400 flex items-center gap-1.5 border border-yellow-400/40 pointer-events-none select-none z-10"
            >
              👤 {viewerCount.toLocaleString()}
            </div>
          )}

          {/* Custom Controls Bar matching image */}
          <div 
            className={`absolute bottom-0 inset-x-0 bg-slate-950/90 backdrop-blur-xs px-3.5 py-2 flex items-center justify-between gap-3 md:gap-4 transition-all duration-300 border-t border-slate-800/40 z-20 ${
              showControls ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0 pointer-events-none'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Play/Pause control option */}
            <button
              id="playPauseBtn"
              onClick={togglePlay}
              onFocus={() => {
                setShowControls(true);
                if (controlsTimeoutRef.current) {
                  window.clearTimeout(controlsTimeoutRef.current);
                  controlsTimeoutRef.current = null;
                }
              }}
              onBlur={() => {
                triggerControlsActivity();
              }}
              className="text-white hover:text-yellow-400 cursor-pointer p-1 transition-colors outline-hidden flex-none"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-white text-white hover:fill-yellow-400 hover:text-yellow-400 transition-colors" />
              ) : (
                <Play className="w-4 h-4 fill-white text-white hover:fill-yellow-400 hover:text-yellow-400 transition-colors" />
              )}
            </button>

            {/* Passive LIVE indicator */}
            <div className="flex-1 flex items-center justify-start relative select-none">
              <span className="text-[10px] font-black tracking-widest text-[#facc15] uppercase flex items-center gap-1.5 animate-pulse drop-shadow-md">
                <span className="w-2 h-2 rounded-full bg-[#facc15]" /> Live Stream
              </span>
            </div>

            {/* Right side group icons: Volume, Gear settings, Fullscreen */}
            <div className="flex items-center gap-2.5 md:gap-3 flex-none relative">
              {/* Volume Controller with interactive sound slider */}
              <div className="flex items-center gap-1 bg-slate-900/40 px-1 py-0.5 rounded-lg border border-white/5">
                <button
                  onClick={toggleMute}
                  className="text-white hover:text-yellow-400 cursor-pointer p-1 transition-colors outline-hidden flex justify-center items-center"
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setVolume(val);
                    if (val > 0) {
                      setIsMuted(false);
                    } else {
                      setIsMuted(true);
                    }
                  }}
                  className="w-12 sm:w-16 h-1 accent-yellow-400 bg-slate-850 rounded-full appearance-none cursor-pointer focus:outline-hidden"
                  style={{
                    background: `linear-gradient(to right, #facc15 0%, #facc15 ${(isMuted ? 0 : volume) * 100}%, #334155 ${(isMuted ? 0 : volume) * 100}%, #334155 100%)`,
                  }}
                  title="Volume"
                />
              </div>

              {/* Quality Settings (Using qualityBtn trigger for TV Spatial System compatibility) */}
              <div className="relative">
                <button
                  id="qualityBtn"
                  onClick={(e) => {
                    e.stopPropagation();
                    playBeep('select');
                    setShowQualityMenu(!showQualityMenu);
                  }}
                  onFocus={() => {
                    setShowControls(true);
                    if (controlsTimeoutRef.current) {
                      window.clearTimeout(controlsTimeoutRef.current);
                      controlsTimeoutRef.current = null;
                    }
                  }}
                  onBlur={() => {
                    triggerControlsActivity();
                  }}
                  className={`text-white hover:text-yellow-400 cursor-pointer p-1 transition-colors outline-hidden flex justify-center items-center ${
                    showQualityMenu ? 'text-yellow-400' : ''
                  }`}
                  title="Quality Settings"
                >
                  <Settings className="w-4 h-4" />
                </button>

                {/* Popover options list */}
                {showQualityMenu && (
                  <div 
                    id="qualityMenu"
                    className="absolute bottom-9 right-0 bg-slate-900/98 backdrop-blur-lg border border-yellow-400/50 rounded-xl py-1 min-w-[100px] shadow-2xl flex flex-col z-50 animate-fade-in"
                  >
                    <div className="px-2.5 py-1 text-[9px] text-slate-400 uppercase font-bold tracking-wider border-b border-slate-800">
                      Quality
                    </div>
                    {(['auto', 'high', 'medium', 'low'] as PlaybackQuality[]).map((q) => (
                      <button
                        key={q}
                        onClick={() => selectQuality(q)}
                        tabIndex={0}
                        onFocus={() => {
                          setShowControls(true);
                          if (controlsTimeoutRef.current) {
                            window.clearTimeout(controlsTimeoutRef.current);
                            controlsTimeoutRef.current = null;
                          }
                        }}
                        onBlur={() => {
                          triggerControlsActivity();
                        }}
                        className={`quality-opt-btn px-3 py-1.5 text-left text-[11px] hover:bg-yellow-400 hover:text-slate-950 transition-colors cursor-pointer outline-hidden flex justify-between items-center ${
                          playbackQuality === q ? 'bg-yellow-400/10 text-yellow-400 font-bold font-bold' : 'text-slate-300'
                        }`}
                      >
                        <span>{q.toUpperCase()}</span>
                        {playbackQuality === q && <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Toggle fullscreen */}
              <button
                id="fsToggleBtn"
                onClick={toggleFullscreen}
                onFocus={() => {
                  setShowControls(true);
                  if (controlsTimeoutRef.current) {
                    window.clearTimeout(controlsTimeoutRef.current);
                    controlsTimeoutRef.current = null;
                  }
                }}
                onBlur={() => {
                  triggerControlsActivity();
                }}
                className="text-white hover:text-yellow-450 hover:scale-115 active:scale-95 transition-all cursor-pointer p-1.5 flex justify-center items-center rounded-lg bg-white/5 border border-white/5 hover:bg-white/12 select-none"
                title="Toggle Fullscreen"
              >
                {isFullscreen || isPseudoFullscreen ? (
                  <svg className="w-5.5 h-5.5 text-yellow-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 4v4H4" />
                    <path d="M16 4v4h4" />
                    <path d="M16 20v-4h4" />
                    <path d="M8 20v-4H4" />
                  </svg>
                ) : (
                  <svg className="w-5.5 h-5.5 text-yellow-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 8V4h4" />
                    <path d="M16 4h4v4" />
                    <path d="M16 20h4v-4" />
                    <path d="M4 16v4h4" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Dynamic Status Display Overlay */}
          {statusMessage && (
            <div className="absolute bottom-12 inset-x-0 mx-auto max-w-xs text-center bg-black/85 backdrop-blur-md text-yellow-400 text-xs py-2 px-4 rounded-xl border-l-4 border-yellow-400 shadow-lg pointer-events-none z-10 select-none">
              {statusMessage}
            </div>
          )}

          {/* Embedded FullscreenChannelPanel that is DOM-scoped inside #videoContainer */}
          <FullscreenChannelPanel
            isOpen={isFullscreenPanelOpen}
            onClose={() => setIsFullscreenPanelOpen(false)}
            filteredChannels={filteredChannels}
            activeChannelUrl={activeChannelUrl}
            onSelectChannel={onSelectChannel}
          />
        </div>
      </div>
    </section>
  );
};
