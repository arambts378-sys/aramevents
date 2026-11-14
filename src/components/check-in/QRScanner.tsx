"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats, Html5QrcodeCameraScanConfig } from 'html5-qrcode';

interface QRScannerProps {
  eventId: string;
  accessZoneId: string;
  onScanResult: (result: ScanLog) => void;
  disabled?: boolean;
  scannerToken?: string | null;
}

export type ScanResultState = 'idle' | 'starting' | 'ready' | 'validating' | 'allowed' | 'denied' | 'camera_error' | 'network_error';

export interface ScanLog {
  id: string;
  timestamp: string;
  result: 'allowed' | 'denied';
  reason: string | null;
  message: string;
}

// Module-level lock for Strict Mode mount/unmount sequencing
let globalScannerCleanupPromise: Promise<void> | null = null;

/** How long a result stays on screen before the camera scans again. */
const RESULT_VISIBLE_MS = 2500;
/**
 * After a result, the same QR is ignored this long. The camera reads ~10 frames a second, so a
 * ticket still held in front of it would otherwise be sent again and again and show "already
 * checked in" over the successful check-in.
 */
const SAME_TICKET_COOLDOWN_MS = 8000;

export default function QRScanner({ eventId, accessZoneId, onScanResult, disabled, scannerToken }: QRScannerProps) {
  const containerId = "qr-reader";
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isStartingRef = useRef(false);
  const isRunningRef = useRef(false);
  const isStoppingRef = useRef(false);
  const activeStartPromiseRef = useRef<Promise<void> | null>(null);

  const [status, setStatus] = useState<ScanResultState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cameras, setCameras] = useState<any[]>([]);
  const [activeCameraId, setActiveCameraId] = useState<string | null>(null);
  const [currentResult, setCurrentResult] = useState<{ result: string, message: string, reason?: string | null } | null>(null);

  // The camera library keeps the scan callback it was started with, so everything that callback
  // reads must be a ref: React state captured at start-up would never change inside it.
  const processingRef = useRef(false);
  const lastScanRef = useRef<{ text: string; at: number } | null>(null);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef({ eventId, accessZoneId, scannerToken, onScanResult, disabled });
  useLayoutEffect(() => {
    latestRef.current = { eventId, accessZoneId, scannerToken, onScanResult, disabled };
  });

  const startScanner = async (cameraId?: string) => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    
    // 1. Prevent duplicate starts synchronously
    if (isStartingRef.current || isStoppingRef.current) return;
    isStartingRef.current = true;
    
    const doStart = async () => {
      try {
        setStatus('starting');

        // Stop if currently running
        if (isRunningRef.current || scanner.isScanning) {
          try {
            await scanner.stop();
          } catch (e) {
            console.warn("Failed to stop scanner before restart", e);
          }
          isRunningRef.current = false;
        }

        const config: Html5QrcodeCameraScanConfig = { fps: 10, qrbox: { width: 250, height: 250 } };
        const targetCamera = cameraId ? cameraId : { facingMode: "environment" };

        await scanner.start(
          targetCamera,
          config,
          onScanSuccess,
          undefined
        );
        
        isRunningRef.current = true;
        if (cameraId) setActiveCameraId(cameraId);
        setStatus('ready');
        setErrorMessage(null);
        setCurrentResult(null);
      } catch (err: any) {
        console.error("Scanner start error:", err);
        setStatus('camera_error');
        setErrorMessage(err.message || 'Failed to start camera.');
        isRunningRef.current = false;
      } finally {
        isStartingRef.current = false;
      }
    };

    activeStartPromiseRef.current = doStart();
    await activeStartPromiseRef.current;
  };

  // Initialize Scanner and fetch cameras
  useEffect(() => {
    let isMounted = true;
    
    const init = async () => {
      // Wait for any previous Strict Mode unmount to finish completely
      while (globalScannerCleanupPromise) {
        await globalScannerCleanupPromise;
      }
      if (!isMounted) return;

      const scanner = new Html5Qrcode(containerId, { formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE], verbose: false });
      scannerRef.current = scanner;

      try {
        setStatus('starting');
        const devices = await Html5Qrcode.getCameras();
        if (!isMounted) return;

        if (devices && devices.length > 0) {
          setCameras(devices);
          await startScanner(devices[0].id);
        } else {
          setStatus('camera_error');
          setErrorMessage('No cameras found on this device.');
        }
      } catch (err: any) {
        if (isMounted) {
          setStatus('camera_error');
          setErrorMessage(err.message || 'Camera permission denied or unavailable.');
        }
      }
    };

    const mountPromise = init();

    return () => {
      isMounted = false;
      isStoppingRef.current = true;
      
      let resolveCleanup: () => void;
      globalScannerCleanupPromise = new Promise((resolve) => { resolveCleanup = resolve; });

      const cleanup = async () => {
        try {
          // Wait for initialization to finish
          await mountPromise;
          
          // Wait for any active start() to resolve
          if (activeStartPromiseRef.current) {
            await activeStartPromiseRef.current;
          }

          const scanner = scannerRef.current;
          if (scanner) {
            // MUST await stop() before clear()
            if (isRunningRef.current || scanner.isScanning) {
              try {
                await scanner.stop();
              } catch (e) {
                console.warn("Error stopping scanner during cleanup", e);
              }
              isRunningRef.current = false;
            }
            try {
              scanner.clear();
            } catch (e) {
              console.warn("Error clearing scanner during cleanup", e);
            }
          }
        } catch (e) {
          console.error("Cleanup sequence error:", e);
        } finally {
          scannerRef.current = null;
          isStoppingRef.current = false;
          
          // Release lock for next mount
          globalScannerCleanupPromise = null;
          resolveCleanup();
        }
      };

      cleanup();
    };
  }, []);

  // Handle disabled state changes
  useEffect(() => {
    const scanner = scannerRef.current;
    if (!scanner || isStoppingRef.current) return;
    
    if (disabled) {
      if (scanner.getState() === 2) { // SCANNING
        try { scanner.pause(); } catch(e) {}
      }
    } else {
      if (scanner.getState() === 3) { // PAUSED
        try { scanner.resume(); } catch(e) {}
      } else if (!isRunningRef.current && !isStartingRef.current && activeCameraId && status !== 'camera_error' && status !== 'starting') {
        startScanner(activeCameraId);
      }
    }
  }, [disabled, activeCameraId, status]);

  /** Clears the result and lets the camera scan again. */
  const readyForNextScan = () => {
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
    if (isStoppingRef.current) return;
    // The cooldown for the same ticket counts from when scanning resumes.
    if (lastScanRef.current) lastScanRef.current = { ...lastScanRef.current, at: Date.now() };
    processingRef.current = false;
    setCurrentResult(null);
    setStatus('ready');
    if (scannerRef.current && scannerRef.current.getState() === 3) {
      try { scannerRef.current.resume(); } catch(e) {}
    }
  };

  const onScanSuccess = async (rawText: string) => {
    const { eventId, accessZoneId, scannerToken, onScanResult, disabled } = latestRef.current;
    const decodedText = rawText.trim();
    if (!decodedText || processingRef.current || disabled || isStoppingRef.current) return;

    // The same ticket still in front of the camera: ignore it for a few seconds.
    const last = lastScanRef.current;
    if (last && last.text === decodedText && Date.now() - last.at < SAME_TICKET_COOLDOWN_MS) return;

    processingRef.current = true;
    lastScanRef.current = { text: decodedText, at: Date.now() };
    setStatus('validating');

    const scanner = scannerRef.current;
    if (scanner && scanner.getState() === 2) {
      try { scanner.pause(); } catch(e) {}
    }

    try {
      const res = await fetch(`/api/events/${eventId}/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: decodedText, accessZoneId, scannerToken })
      });

      const data = await res.json();
      
      if (!res.ok && res.status >= 500) {
        throw new Error('Server error');
      }

      setStatus(data.result === 'allowed' ? 'allowed' : 'denied');
      setCurrentResult({
        result: data.result,
        reason: data.reason,
        message: data.message || 'Check-in processed'
      });

      onScanResult({
        id: Math.random().toString(36).substring(7),
        timestamp: new Date().toISOString(),
        result: data.result,
        reason: data.reason,
        message: data.message
      });

    } catch (err: any) {
      // Not a verdict on the ticket: let the same QR be retried straight away.
      lastScanRef.current = null;
      setStatus('network_error');
      setCurrentResult({
        result: 'denied',
        message: 'Connection unavailable. Check-in requires a live connection.'
      });
    }

    resumeTimerRef.current = setTimeout(readyForNextScan, RESULT_VISIBLE_MS);
  };

  useEffect(() => () => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
  }, []);

  const alreadyCheckedIn = currentResult?.reason === 'already_checked_in';

  const switchCamera = () => {
    if (cameras.length > 1 && !isStartingRef.current && !isStoppingRef.current) {
      const currentIndex = cameras.findIndex(c => c.id === activeCameraId);
      const nextIndex = (currentIndex + 1) % cameras.length;
      startScanner(cameras[nextIndex].id);
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto">
      
      {/* Status Header */}
      <div className="w-full text-center mb-4 min-h-[2rem]">
        {status === 'starting' && <p className="text-on-surface-variant font-medium">Starting camera...</p>}
        {status === 'ready' && (
          <div className="flex items-center justify-center gap-2 text-primary font-bold">
            <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
            Scanner Ready
          </div>
        )}
        {status === 'validating' && (
          <div className="flex items-center justify-center gap-2 text-on-surface font-bold">
            <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
            Validating...
          </div>
        )}
        {status === 'camera_error' && (
          <p className="text-error font-bold flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[20px]">error</span>
            {errorMessage}
          </p>
        )}
        {status === 'network_error' && (
          <p className="text-error font-bold flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[20px]">wifi_off</span>
            Connection Unavailable
          </p>
        )}
      </div>

      {/* Camera Viewfinder */}
      <div className="relative w-full aspect-square bg-black rounded-2xl overflow-hidden shadow-lg border border-outline-variant/30 flex items-center justify-center">
        
        {/* The actual video target */}
        <div 
          id={containerId} 
          className="absolute inset-0 w-full h-full object-cover [&>video]:object-cover"
        ></div>

        {/* Overlay States */}
        {status === 'allowed' && currentResult && (
          <div role="status" className="absolute inset-0 bg-green-700/90 z-20 flex flex-col items-center justify-center text-white p-6 text-center animate-in fade-in duration-200">
            <span className="material-symbols-outlined text-[64px] mb-2">check_circle</span>
            <h2 className="text-display-sm font-bold uppercase mb-2">CHECK-IN SUCCESSFUL</h2>
            <p className="text-body-lg opacity-90">{currentResult.message}</p>
            <ScanNextButton onClick={readyForNextScan} />
          </div>
        )}

        {status === 'denied' && currentResult && alreadyCheckedIn && (
          <div role="status" className="absolute inset-0 bg-amber-600/95 z-20 flex flex-col items-center justify-center text-white p-6 text-center animate-in fade-in duration-200">
            <span className="material-symbols-outlined text-[64px] mb-2">history</span>
            <h2 className="text-title-lg font-bold uppercase mb-2">ALREADY CHECKED IN</h2>
            <p className="text-body-lg opacity-90">This ticket was already scanned in at this zone. Re-entry is not allowed here.</p>
            <ScanNextButton onClick={readyForNextScan} />
          </div>
        )}

        {status === 'denied' && currentResult && !alreadyCheckedIn && (
          <div role="alert" className="absolute inset-0 bg-error/90 z-20 flex flex-col items-center justify-center text-white p-6 text-center animate-in fade-in duration-200">
            <span className="material-symbols-outlined text-[64px] mb-2">cancel</span>
            <h2 className="text-title-lg font-bold uppercase mb-2">CHECK-IN DENIED</h2>
            <p className="text-body-lg opacity-90">{currentResult.message}</p>
            <ScanNextButton onClick={readyForNextScan} />
          </div>
        )}

        {status === 'network_error' && currentResult && (
          <div role="alert" className="absolute inset-0 bg-neutral-800/95 z-20 flex flex-col items-center justify-center text-white p-6 text-center animate-in fade-in duration-200">
            <span className="material-symbols-outlined text-[64px] mb-2">wifi_off</span>
            <h2 className="text-title-lg font-bold uppercase mb-2">NOT CHECKED</h2>
            <p className="text-body-lg opacity-90">{currentResult.message} Scan the ticket again.</p>
            <ScanNextButton onClick={readyForNextScan} />
          </div>
        )}

      </div>

      {/* Camera Controls */}
      {cameras.length > 1 && status !== 'camera_error' && (
        <button 
          onClick={switchCamera}
          className="mt-6 flex items-center gap-2 text-primary font-medium hover:bg-primary-container px-4 py-2 rounded-full transition-colors"
        >
          <span className="material-symbols-outlined">flip_camera_ios</span>
          Switch Camera
        </button>
      )}

      {status === 'camera_error' && (
        <button 
          onClick={() => startScanner()}
          className="mt-6 flex items-center gap-2 bg-primary text-white font-bold px-6 py-3 rounded-full hover:bg-primary/90 transition-colors"
        >
          <span className="material-symbols-outlined">refresh</span>
          Retry Camera
        </button>
      )}

    </div>
  );
}


function ScanNextButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/20 px-5 py-2.5 text-[15px] font-semibold text-white hover:bg-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
    >
      <span className="material-symbols-outlined text-[20px]" aria-hidden="true">qr_code_scanner</span>
      Scan next
    </button>
  );
}
