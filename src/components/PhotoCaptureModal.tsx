/**
 * ============================================================================
 * ACC MANDATORY PLAYER PHOTO CAPTURE & UPLOAD MODAL
 * ============================================================================
 * Implements Requirement 10 (Profile Picture Restrictions):
 * - Uploaded image must contain a clear player face.
 * - Image must have a suitable/plain background.
 * - Configurable maximum file size limit.
 * - Rejection guidance if non-compliant.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, RefreshCw, CheckCircle, AlertCircle, X, ShieldAlert } from 'lucide-react';
import { validatePlayerProfilePicture } from '../utils/imageValidation';

interface PhotoCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotoSelected: (dataUrl: string) => void;
  title?: string;
}

export const PhotoCaptureModal: React.FC<PhotoCaptureModalProps> = ({
  isOpen,
  onClose,
  onPhotoSelected,
  title = 'Capture / Upload Photograph',
}) => {
  const [mode, setMode] = useState<'CHOICE' | 'CAMERA' | 'PREVIEW'>('CHOICE');
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    setValidationError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setMode('CAMERA');
    } catch {
      setCameraError('Unable to access camera. Please allow camera permissions or upload a file.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const captureFrame = async () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const v = videoRef.current;
    const size = Math.min(v.videoWidth, v.videoHeight);
    const startX = (v.videoWidth - size) / 2;
    const startY = (v.videoHeight - size) / 2;

    ctx.drawImage(v, startX, startY, size, size, 0, 0, 400, 400);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
    stopCamera();

    // Validate face and lighting
    setValidating(true);
    const validation = await validatePlayerProfilePicture(dataUrl);
    setValidating(false);

    if (!validation.valid) {
      setValidationError(validation.error || 'The captured photo did not pass face validation. Please try again with clear lighting and a plain background.');
      setMode('CHOICE');
      return;
    }

    setPhotoData(dataUrl);
    setMode('PREVIEW');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setValidationError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const forbidden = ['.exe', '.sh', '.bat', '.msi', '.cmd', '.vbs', '.js', '.bin'];
    const nameLower = file.name.toLowerCase();
    if (forbidden.some((ext) => nameLower.endsWith(ext))) {
      setValidationError('Security violation: Executable files disguised as images are strictly prohibited.');
      return;
    }

    const validMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validMimes.includes(file.type.toLowerCase())) {
      setValidationError('Invalid format. Only JPEG, PNG, and WebP images are permitted.');
      return;
    }

    setValidating(true);
    const validation = await validatePlayerProfilePicture(file);
    if (!validation.valid) {
      setValidating(false);
      setValidationError(validation.error || 'Image did not meet profile photo regulations.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 400;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const size = Math.min(img.width, img.height);
        const startX = (img.width - size) / 2;
        const startY = (img.height - size) / 2;
        ctx.drawImage(img, startX, startY, size, size, 0, 0, 400, 400);
        const compressedData = canvas.toDataURL('image/jpeg', 0.82);
        setPhotoData(compressedData);
        setValidating(false);
        setMode('PREVIEW');
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleConfirm = () => {
    if (photoData) {
      onPhotoSelected(photoData);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
          <h3 className="font-heading text-lg font-bold text-slate-100 flex items-center gap-2">
            <Camera className="w-5 h-5 text-blue-400" />
            {title}
          </h3>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center">
          {validationError && (
            <div className="w-full mb-4 p-3 rounded-xl bg-red-950/80 border border-red-700 text-red-300 text-xs flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              <span>{validationError}</span>
            </div>
          )}

          {cameraError && (
            <div className="w-full mb-4 p-3 rounded-xl bg-amber-950/80 border border-amber-700 text-amber-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{cameraError}</span>
            </div>
          )}

          {validating && (
            <div className="w-full mb-4 p-3 rounded-xl bg-blue-950/60 border border-blue-800 text-cyan-300 text-xs flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin shrink-0" />
              <span>Validating face visibility and plain background compliance...</span>
            </div>
          )}

          {mode === 'CHOICE' && (
            <div className="w-full flex flex-col gap-4">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-xs leading-relaxed">
                <span className="font-bold text-amber-400 block mb-1">
                  Official Photo Guidelines (Requirement 10):
                </span>
                <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
                  <li>Front-facing portrait showing a clear, well-lit face.</li>
                  <li>Plain/suitable background (white, light grey, or solid color).</li>
                  <li>No sunglasses, face masks, or heavily obscured photos.</li>
                </ul>
              </div>

              <button
                onClick={startCamera}
                className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center justify-center gap-2.5 shadow-lg shadow-blue-900/40 transition cursor-pointer"
              >
                <Camera className="w-5 h-5" />
                Open Live Camera
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Upload className="w-5 h-5" />
                Upload from Gallery / Files
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          )}

          {mode === 'CAMERA' && (
            <div className="w-full flex flex-col items-center gap-4">
              <div className="relative w-64 h-64 rounded-2xl overflow-hidden bg-black border-2 border-blue-500 shadow-inner">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 border-2 border-dashed border-white/40 pointer-events-none rounded-full m-6" />
              </div>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => {
                    stopCamera();
                    setMode('CHOICE');
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-sm transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={captureFrame}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  Capture Photo
                </button>
              </div>
            </div>
          )}

          {mode === 'PREVIEW' && photoData && (
            <div className="w-full flex flex-col items-center gap-4">
              <div className="w-48 h-48 rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-xl bg-black">
                <img src={photoData} alt="Preview" className="w-full h-full object-cover" />
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                <CheckCircle className="w-4 h-4" />
                Face and background verified compliant
              </div>
              <div className="flex gap-3 w-full mt-2">
                <button
                  onClick={() => {
                    setPhotoData(null);
                    setMode('CHOICE');
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-sm flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retake / Replace
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-900/40 transition cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" />
                  Use This Photo
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
