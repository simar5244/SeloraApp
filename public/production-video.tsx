"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useVideoPreload } from '@/components/video-preloader';
import { mobileVideoManager } from '@/utils/mobile-video-manager';

interface ProductionVideoProps {
  src: string;
  className?: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  playsInline?: boolean;
  onCanPlay?: () => void;
  onReady?: () => void; // Called when video is truly ready for production
  forceReady?: boolean; // Force ready state immediately (for modal context after 7+ seconds)
}

export default function ProductionVideo({
  src,
  className = "",
  autoPlay = false,
  loop = false,
  muted = true,
  playsInline = true,
  onCanPlay,
  onReady,
  forceReady = false,
}: ProductionVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { isVideoCached } = useVideoPreload();

  // Mobile detection for memory management
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  const [isReady, setIsReady] = useState(false);
  const [hasStartedPlaying, setHasStartedPlaying] = useState(false);
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const readyCheckRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Detect if we're in production (deployed) environment
  const isProduction = process.env.NODE_ENV === 'production' && typeof window !== 'undefined' &&
    (window.location.hostname.includes('vercel.app') || window.location.hostname.includes('seloraa.com'));

  // Aggressive ready check for production environments
  const checkIfReady = useCallback(() => {
    const video = videoRef.current;
    if (!video) return false;

    const isCached = isVideoCached(src);
    const hasEnoughData = video.readyState >= 3; // HAVE_FUTURE_DATA
    const hasMetadata = video.readyState >= 1; // HAVE_METADATA
    const isLoadedEnough = video.buffered.length > 0 && video.buffered.end(0) > 0.5;
    const hasMinimumBuffer = video.buffered.length > 0 && video.buffered.end(0) > 1.0; // At least 1 second

    console.log('🎬 ProductionVideo: Ready check:', {
      src,
      isProduction,
      isCached,
      readyState: video.readyState,
      hasEnoughData,
      hasMetadata,
      isLoadedEnough,
      hasMinimumBuffer,
      bufferedEnd: video.buffered.length > 0 ? video.buffered.end(0) : 0,
      duration: video.duration
    });

    let isProductionReady = false;

    if (isProduction) {
      // In production, be MUCH more aggressive - we've had 7+ seconds!
      // Just need basic playability, not perfect buffering
      isProductionReady = hasMetadata || hasEnoughData || isLoadedEnough;
    } else {
      // Local development - more lenient
      isProductionReady = (isCached && hasMetadata) || hasEnoughData || isLoadedEnough;
    }

    if (isProductionReady && !isReady) {
      console.log('🎬 ProductionVideo: Video is production ready!');
      setIsReady(true);
      onReady?.();
      return true;
    }

    return isProductionReady;
  }, [src, isVideoCached, isReady, onReady, isProduction]);

  // Force ready state if requested (modal context after 7+ seconds)
  useEffect(() => {
    if (forceReady && !isReady) {
      console.log('🎬 ProductionVideo: Force ready requested - we have had 7+ seconds!');
      setIsReady(true);
      onReady?.();
    }
  }, [forceReady, isReady, onReady]);

  // Mobile-specific: Pause all other videos when this one starts playing
  useEffect(() => {
    if (isMobile && autoPlay && isReady) {
      const videos = document.querySelectorAll('video');
      videos.forEach(video => {
        if (video !== videoRef.current) {
          video.pause();
          video.currentTime = 0;
        }
      });
    }
  }, [isMobile, autoPlay, isReady]);

  // Immediate check on mount - videos might already be ready after 7+ seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('🎬 ProductionVideo: Immediate mount check after 7+ seconds of prep time');
      checkIfReady();
    }, 10); // Very small delay to ensure video element is ready

    return () => clearTimeout(timer);
  }, [checkIfReady]);

  // Continuous ready checking with timeout
  useEffect(() => {
    if (isReady || hasTimedOut) return;

    const startChecking = () => {
      if (readyCheckRef.current) {
        clearInterval(readyCheckRef.current);
      }

      readyCheckRef.current = setInterval(() => {
        if (checkIfReady()) {
          if (readyCheckRef.current) {
            clearInterval(readyCheckRef.current);
            readyCheckRef.current = null;
          }
        }
      }, 25); // Check every 25ms - very aggressive since we have 7+ seconds
    };

    // Set timeout for production environments - be more conservative on mobile
    const timeoutDuration = isMobile ? 3000 : (isProduction ? 2000 : 5000); // 3s for mobile, 2s for production, 5s for dev
    timeoutRef.current = setTimeout(() => {
      console.log('🎬 ProductionVideo: Timeout reached after 7+ seconds of prep time, forcing ready state');
      setHasTimedOut(true);
      setIsReady(true);
      onReady?.();

      if (readyCheckRef.current) {
        clearInterval(readyCheckRef.current);
        readyCheckRef.current = null;
      }
    }, timeoutDuration);

    // Start checking immediately
    if (!checkIfReady()) {
      startChecking();
    }

    return () => {
      if (readyCheckRef.current) {
        clearInterval(readyCheckRef.current);
        readyCheckRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [checkIfReady, isReady, hasTimedOut, isProduction, onReady]);

  // Handle video events
  const handleCanPlay = useCallback(() => {
    console.log('🎬 ProductionVideo: canPlay event');
    onCanPlay?.();
    checkIfReady();
  }, [onCanPlay, checkIfReady]);

  const handleLoadedData = useCallback(() => {
    console.log('🎬 ProductionVideo: loadedData event');
    checkIfReady();
  }, [checkIfReady]);

  const handleCanPlayThrough = useCallback(() => {
    console.log('🎬 ProductionVideo: canPlayThrough event');
    checkIfReady();
  }, [checkIfReady]);

  // Handle autoPlay when ready
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !autoPlay || !isReady || hasStartedPlaying) return;

    console.log('🎬 ProductionVideo: Starting autoplay for ready video');
    
    const playPromise = video.play();
    if (playPromise) {
      playPromise
        .then(() => {
          console.log('🎬 ProductionVideo: Autoplay successful');
          setHasStartedPlaying(true);
        })
        .catch((error) => {
          console.warn('🎬 ProductionVideo: Autoplay failed:', error);
        });
    }
  }, [autoPlay, isReady, hasStartedPlaying]);

  // Register/unregister video with mobile manager
  useEffect(() => {
    const video = videoRef.current;
    if (isMobile && video) {
      mobileVideoManager.registerVideo(video);

      return () => {
        mobileVideoManager.unregisterVideo(video);
      };
    }
  }, [isMobile]);

  // Simple mobile cleanup when component unmounts
  useEffect(() => {
    return () => {
      if (isMobile && videoRef.current) {
        const video = videoRef.current;
        video.pause();
      }
    };
  }, [isMobile]);

  return (
    <div className={`relative ${className}`}>
      {/* Only show loading in development - production should never need this after 7+ seconds */}
      {!isProduction && !isReady && !hasTimedOut && (
        <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
          <div className="text-white text-sm">Loading video...</div>
        </div>
      )}

      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        style={{
          opacity: isReady ? 1 : 0,
          transition: isProduction ? 'opacity 0.1s ease-in-out' : 'opacity 0.3s ease-in-out'
        }}
        src={src}
        preload="auto"
        autoPlay={false} // We handle autoplay manually
        loop={loop}
        muted={muted}
        playsInline={playsInline}
        onCanPlay={handleCanPlay}
        onLoadedData={handleLoadedData}
        onCanPlayThrough={handleCanPlayThrough}
        onPlay={() => {
          console.log('🎬 ProductionVideo: Video started playing');
          setHasStartedPlaying(true);
        }}
        onError={(e) => {
          console.error('🎬 ProductionVideo: Video error:', e);
        }}
      />
    </div>
  );
}
