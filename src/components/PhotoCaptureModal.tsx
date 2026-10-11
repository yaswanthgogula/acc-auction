/**
 * ============================================================================
 * ACC MANDATORY PLAYER PHOTO CAPTURE, CROP & EDIT MODAL
 * ============================================================================
 * Features:
 * - Direct Live Camera feed with reliable stream attachment & fallback.
 * - Interactive Crop & Edit tool with zoom, rotation (90° steps), and panning.
 * - Gallery / local file upload support with the same Crop & Edit workflow.
 * - Profile Picture face and plain background compliance verification.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  Upload,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  X,
  ShieldAlert,
  Crop,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Move,
  SwitchCamera,
} from 'lucide-react';
import { validatePlayerProfilePicture } from '../utils/imageValidation';

interface PhotoCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotoSelected: (dataUrl: string) => void;
  title?: string;
  initialImage?: string | null;
  initialMode?: 'CHOICE' | 'CAMERA' | 'CROP';
}

export const PhotoCaptureModal: React.FC<PhotoCaptureModalProps> = ({
  isOpen,
  onClose,
  onPhotoSelected,
  title = 'Capture & Crop Player Photograph',
  initialImage = null,
  initialMode = 'CAMERA',
}) => {
  const [mode, setMode] = useState<'CHOICE' | 'CAMERA' | 'CROP' | 'PREVIEW'>('CAMERA');
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(initialImage);
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  // Crop & Edit Transformations
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cropCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cropImageRef = useRef<HTMLImageElement | null>(null);

  // Stop camera on unmount or close
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
      } catch {}
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const startCamera = useCallback(async (facing: 'user' | 'environment' = facingMode) => {
    setCameraError(null);
    setValidationError(null);
    stopCamera();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera device access is not supported by this browser. Please upload an image file from your device.');
      }

      let stream: MediaStream | null = null;
      const constraintSets = [
        { video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
        { video: { facingMode: facing }, audio: false },
        { video: true, audio: false },
      ];

      for (const c of constraintSets) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(c);
          if (stream) break;
        } catch {}
      }

      if (!stream) {
        setCameraError('Could not access camera feed. Please allow camera permissions or upload an image file.');
        setMode('CHOICE');
        return;
      }

      streamRef.current = stream;
      setFacingMode(facing);
      setMode('CAMERA');

      // Attach immediately to video element if present
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('autoplay', 'true');
        videoRef.current.muted = true;
        try {
          await videoRef.current.play();
        } catch (e) {
          console.warn('Video play caught:', e);
        }
      }
    } catch (err: any) {
      console.warn('Camera access unavailable:', err?.message || err);
      setCameraError(
        err.message || 'Unable to access camera. Please allow camera permissions in your browser or select an image file.'
      );
      setMode('CHOICE');
    }
  }, [facingMode, stopCamera]);

  useEffect(() => {
    if (isOpen) {
      setCameraError(null);
      setValidationError(null);
      setZoom(1);
      setRotation(0);
      setPanOffset({ x: 0, y: 0 });

      if (initialImage) {
        setRawImageSrc(initialImage);
        setMode('CROP');
      } else if (initialMode === 'CAMERA') {
        setRawImageSrc(null);
        setMode('CAMERA');
        startCamera('user');
      } else {
        setRawImageSrc(null);
        setMode('CHOICE');
      }
    } else {
      stopCamera();
    }
  }, [isOpen, initialImage, initialMode, startCamera, stopCamera]);

  const toggleCameraFacing = async () => {
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    await startCamera(nextFacing);
  };

  const captureFrame = () => {
    if (!videoRef.current) return;
    const v = videoRef.current;
    if (v.videoWidth === 0 || v.videoHeight === 0) {
      setCameraError('Camera is still initializing. Please wait a moment and tap capture again.');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(v, 0, 0, v.videoWidth, v.videoHeight);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    stopCamera();

    // Send to Crop & Edit mode
    setRawImageSrc(dataUrl);
    setZoom(1);
    setRotation(0);
    setPanOffset({ x: 0, y: 0 });
    setMode('CROP');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValidationError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const validMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validMimes.includes(file.type.toLowerCase())) {
      setValidationError('Invalid format. Please select a JPEG, PNG, or WebP image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setRawImageSrc(dataUrl);
      setZoom(1);
      setRotation(0);
      setPanOffset({ x: 0, y: 0 });
      setMode('CROP');
    };
    reader.readAsDataURL(file);
  };

  // Generate cropped image on canvas
  const applyCrop = async () => {
    if (!cropImageRef.current || !rawImageSrc) return;
    setValidating(true);
    setValidationError(null);

    try {
      const img = cropImageRef.current;
      const targetSize = 400; // Standard 400x400 passport square
      const canvas = document.createElement('canvas');
      canvas.width = targetSize;
      canvas.height = targetSize;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not initialize canvas context');

      // Clear
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, targetSize, targetSize);

      ctx.save();
      // Move to center of canvas
      ctx.translate(targetSize / 2, targetSize / 2);
      ctx.rotate((rotation * Math.PI) / 180);

      // Scale & translate according to crop adjustments
      const baseScale = Math.max(targetSize / img.naturalWidth, targetSize / img.naturalHeight);
      const totalScale = baseScale * zoom;

      // Draw transformed image
      ctx.drawImage(
        img,
        -((img.naturalWidth * totalScale) / 2) + panOffset.x,
        -((img.naturalHeight * totalScale) / 2) + panOffset.y,
        img.naturalWidth * totalScale,
        img.naturalHeight * totalScale
      );
      ctx.restore();

      const finalCroppedDataUrl = canvas.toDataURL('image/jpeg', 0.85);

      // Validate image face & background
      const validation = await validatePlayerProfilePicture(finalCroppedDataUrl);
      if (!validation.valid) {
        setValidationError(validation.error || 'Face verification failed. Please ensure your face is centered and clearly lit.');
        setValidating(false);
        return;
      }

      setPhotoData(finalCroppedDataUrl);
      setMode('PREVIEW');
    } catch (err: any) {
      setValidationError(err.message || 'Error processing cropped image.');
    } finally {
      setValidating(false);
    }
  };

  // Mouse & Touch drag handling for panning
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - panOffset.x,
        y: e.touches[0].clientY - panOffset.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPanOffset({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleConfirm = () => {
    if (photoData) {
      onPhotoSelected(photoData);
      stopCamera();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <h3 className="font-heading text-lg font-bold text-white flex items-center gap-2">
            <Camera className="w-5 h-5 text-cyan-400" />
            {title}
          </h3>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex flex-col items-center gap-4 text-xs">
          {validationError && (
            <div className="w-full p-3.5 rounded-2xl bg-red-950/80 border border-red-700 text-red-300 flex items-start gap-2 shadow-lg">
              <ShieldAlert className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              <span>{validationError}</span>
            </div>
          )}

          {cameraError && (
            <div className="w-full p-3.5 rounded-2xl bg-amber-950/80 border border-amber-700 text-amber-300 flex items-start gap-2 shadow-lg">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{cameraError}</span>
            </div>
          )}

          {validating && (
            <div className="w-full p-3 rounded-2xl bg-cyan-950/60 border border-cyan-800 text-cyan-300 flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin shrink-0" />
              <span>Analyzing face visibility and applying crop transformations...</span>
            </div>
          )}

          {/* MODE 1: CHOICE */}
          {mode === 'CHOICE' && (
            <div className="w-full flex flex-col gap-4">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-slate-300 leading-relaxed">
                <span className="font-bold text-amber-400 block mb-1">
                  Official Player Photo Regulations:
                </span>
                <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
                  <li>Front-facing clear portrait with bright lighting.</li>
                  <li>Plain/suitable background (white, grey, or solid neutral background).</li>
                  <li>Built-in interactive crop & edit tool allows zooming, centering, and rotating.</li>
                </ul>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => startCamera('user')}
                  className="py-4 px-4 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-cyan-950/50 transition cursor-pointer"
                >
                  <Camera className="w-5 h-5" />
                  <span>Open Live Camera</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="py-4 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Upload className="w-5 h-5" />
                  <span>Upload from Gallery</span>
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          )}

          {/* MODE 2: LIVE CAMERA */}
          {mode === 'CAMERA' && (
            <div className="w-full flex flex-col items-center gap-4">
              <div className="relative w-72 h-72 rounded-3xl overflow-hidden bg-black border-2 border-cyan-400 shadow-2xl flex items-center justify-center">
                <video
                  ref={(el) => {
                    videoRef.current = el;
                    if (el && streamRef.current && el.srcObject !== streamRef.current) {
                      el.srcObject = streamRef.current;
                      el.play().catch(() => {});
                    }
                  }}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Passport crop guide overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-52 h-52 rounded-full border-2 border-dashed border-cyan-300/80 shadow-[0_0_20px_rgba(6,182,212,0.4)]" />
                </div>

                {/* Flip camera button */}
                <button
                  type="button"
                  onClick={toggleCameraFacing}
                  className="absolute top-3 right-3 p-2 rounded-xl bg-slate-900/80 text-white border border-slate-700 hover:bg-slate-800 transition cursor-pointer"
                  title="Switch front / rear camera"
                >
                  <SwitchCamera className="w-4 h-4" />
                </button>
              </div>

              <p className="text-[11px] text-slate-400 text-center">
                Position your face inside the circle with good lighting, then tap <strong>Capture Photo</strong>.
              </p>

              <div className="flex gap-3 w-full">
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    setMode('CHOICE');
                  }}
                  className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={captureFrame}
                  className="flex-1 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/50 transition cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Capture Photo</span>
                </button>
              </div>
            </div>
          )}

          {/* MODE 3: CROP & EDIT (Requirement: interactive crop edit functional option) */}
          {mode === 'CROP' && rawImageSrc && (
            <div className="w-full flex flex-col items-center gap-4">
              <div className="flex items-center justify-between w-full pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
                  <Crop className="w-4 h-4" />
                  <span>Crop & Adjust Photo</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  Drag to pan • Pinch/Slider to zoom
                </span>
              </div>

              {/* Interactive Cropper Canvas Viewport */}
              <div
                className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-3xl overflow-hidden bg-slate-950 border-2 border-amber-400 cursor-grab active:cursor-grabbing shadow-2xl select-none"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {/* Visual Image with Transformations */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <img
                    ref={cropImageRef}
                    src={rawImageSrc}
                    alt="To Crop"
                    style={{
                      transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                      transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                      maxWidth: 'none',
                      maxHeight: 'none',
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                    }}
                    draggable={false}
                  />
                </div>

                {/* Semi-transparent Darkened Mask Outside the Crop Area */}
                <div className="absolute inset-0 pointer-events-none border-4 border-amber-400/80 rounded-2xl shadow-[inset_0_0_0_9999px_rgba(0,0,0,0.45)] flex items-center justify-center">
                  <div className="w-full h-full border border-dashed border-white/60 pointer-events-none" />
                </div>

                <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/75 text-[10px] font-mono text-amber-300 pointer-events-none">
                  Zoom: {Math.round(zoom * 100)}% · Rot: {rotation}°
                </div>
              </div>

              {/* Crop Controls: Zoom & Rotate & Reset */}
              <div className="w-full flex flex-col gap-3 p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-slate-300 text-xs">
                    <ZoomIn className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Zoom Scale:</span>
                  </div>
                  <div className="flex items-center gap-2 flex-1 max-w-xs">
                    <button
                      type="button"
                      onClick={() => setZoom((prev) => Math.max(0.8, prev - 0.1))}
                      className="p-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="range"
                      min="0.8"
                      max="3.0"
                      step="0.05"
                      value={zoom}
                      onChange={(e) => setZoom(parseFloat(e.target.value))}
                      className="w-full accent-cyan-500 cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => setZoom((prev) => Math.min(3.0, prev + 0.1))}
                      className="p-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-900">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setRotation((prev) => (prev + 90) % 360)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
                      Rotate 90°
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setZoom(1);
                        setRotation(0);
                        setPanOffset({ x: 0, y: 0 });
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                      Reset
                    </button>
                  </div>

                  <span className="text-[10px] text-slate-400 font-mono">
                    Centered Square Avatar
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 w-full">
                <button
                  type="button"
                  onClick={() => {
                    setRawImageSrc(null);
                    setMode('CHOICE');
                  }}
                  className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition cursor-pointer"
                >
                  Retake / Change
                </button>
                <button
                  type="button"
                  disabled={validating}
                  onClick={applyCrop}
                  className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition cursor-pointer"
                >
                  <Crop className="w-4 h-4" />
                  <span>{validating ? 'Verifying...' : 'Crop & Verify'}</span>
                </button>
              </div>
            </div>
          )}

          {/* MODE 4: PREVIEW VERIFIED IMAGE */}
          {mode === 'PREVIEW' && photoData && (
            <div className="w-full flex flex-col items-center gap-4">
              <div className="w-52 h-52 rounded-3xl overflow-hidden border-2 border-emerald-500 shadow-2xl bg-black">
                <img src={photoData} alt="Verified Preview" className="w-full h-full object-cover" />
              </div>

              <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-800/80 text-emerald-300 flex items-center gap-2 text-xs">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Photograph cropped and verified compliant with tournament regulations!</span>
              </div>

              <div className="flex gap-3 w-full pt-1">
                <button
                  type="button"
                  onClick={() => setMode('CROP')}
                  className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Crop className="w-4 h-4 text-cyan-400" />
                  <span>Re-crop / Edit</span>
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/50 transition cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Use This Photo</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
