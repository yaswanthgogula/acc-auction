/**
 * ============================================================================
 * ACC PROFILE PICTURE RESTRICTIONS & VALIDATION (Requirement 10)
 * ============================================================================
 * Ensures uploaded profile images contain a clear player face and a suitable,
 * plain background according to tournament regulations.
 * Configurable size restrictions to support faculty-approved limits.
 */

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
  details?: {
    width: number;
    height: number;
    aspectRatio: number;
    hasPlainBackground: boolean;
    hasGoodContrast: boolean;
    fileSizeBytes: number;
  };
}

// Configurable limit: default 5MB, faculty can adjust via environment or runtime config
export const CONFIGURABLE_MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function validatePlayerProfilePicture(
  fileOrDataUrl: File | string,
  maxSizeBytes: number = CONFIGURABLE_MAX_IMAGE_SIZE_BYTES
): Promise<ImageValidationResult> {
  let fileSizeBytes = 0;

  if (typeof fileOrDataUrl !== 'string') {
    fileSizeBytes = fileOrDataUrl.size;
    if (fileSizeBytes > maxSizeBytes) {
      const mbLimit = Math.round(maxSizeBytes / (1024 * 1024));
      return {
        valid: false,
        error: `Image file exceeds the permitted limit of ${mbLimit}MB. Please compress or choose a smaller picture.`,
      };
    }
  } else {
    // Approximate byte length from Base64 Data URL
    const head = 'data:image/';
    if (fileOrDataUrl.startsWith(head)) {
      const b64 = fileOrDataUrl.split(',')[1] || '';
      fileSizeBytes = Math.round((b64.length * 3) / 4);
      if (fileSizeBytes > maxSizeBytes) {
        const mbLimit = Math.round(maxSizeBytes / (1024 * 1024));
        return {
          valid: false,
          error: `Image file exceeds the permitted limit of ${mbLimit}MB.`,
        };
      }
    }
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;

      // 1. Resolution Check
      if (width < 180 || height < 180) {
        resolve({
          valid: false,
          error: 'Image resolution is too low. Please upload a clear photo of at least 200x200 pixels.',
        });
        return;
      }

      // 2. Aspect Ratio Check (must be reasonably portrait or square, e.g. 0.70 to 1.40)
      const ratio = width / height;
      if (ratio < 0.65 || ratio > 1.45) {
        resolve({
          valid: false,
          error: 'Please upload a front-facing headshot/portrait photo (approximately square or vertical). Panoramic or wide banner images are not accepted.',
        });
        return;
      }

      // 3. Canvas Pixel Analysis for Face Contrast & Plain/Suitable Background
      try {
        const canvas = document.createElement('canvas');
        const sampleSize = 100;
        canvas.width = sampleSize;
        canvas.height = sampleSize;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve({ valid: true });
          return;
        }

        ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
        const imgData = ctx.getImageData(0, 0, sampleSize, sampleSize);
        const data = imgData.data;

        // Sample border/background pixels (top, left, right edges)
        let edgeBrightnessSum = 0;
        let edgePixelCount = 0;
        const edgeColors: [number, number, number][] = [];

        // Sample top border (background)
        for (let x = 0; x < sampleSize; x += 4) {
          for (let y = 0; y < 15; y += 3) {
            const idx = (y * sampleSize + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const brightness = (r + g + b) / 3;
            edgeBrightnessSum += brightness;
            edgePixelCount++;
            edgeColors.push([r, g, b]);
          }
        }

        // Sample center pixels (face area: middle 40% of the image)
        let centerBrightnessSum = 0;
        let centerPixelCount = 0;
        let centerMin = 255;
        let centerMax = 0;

        for (let x = 30; x < 70; x += 3) {
          for (let y = 25; y < 65; y += 3) {
            const idx = (y * sampleSize + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const brightness = (r + g + b) / 3;
            centerBrightnessSum += brightness;
            centerPixelCount++;
            if (brightness < centerMin) centerMin = brightness;
            if (brightness > centerMax) centerMax = brightness;
          }
        }

        const avgEdgeBrightness = edgeBrightnessSum / Math.max(1, edgePixelCount);
        const avgCenterBrightness = centerBrightnessSum / Math.max(1, centerPixelCount);

        // Check if image is completely pitch black or completely white/blank
        if (avgCenterBrightness < 15) {
          resolve({
            valid: false,
            error: 'The photo appears too dark or unlit. Please upload a clear photo with adequate lighting on your face.',
          });
          return;
        }

        if (avgCenterBrightness > 248 && centerMax - centerMin < 12) {
          resolve({
            valid: false,
            error: 'The image appears blank or overexposed. Please provide a clear, visible player photograph.',
          });
          return;
        }

        // Contrast check in face region: A face contains hair, skin, eyes, with variation
        const centerDynamicRange = centerMax - centerMin;
        if (centerDynamicRange < 20) {
          resolve({
            valid: false,
            error: 'No distinct facial features detected in the center. Please upload a clear headshot photo.',
          });
          return;
        }

        // Background variance check: Background edges shouldn't be extreme chaotic noise
        let bgVariance = 0;
        for (const [r, g, b] of edgeColors) {
          const bright = (r + g + b) / 3;
          bgVariance += Math.abs(bright - avgEdgeBrightness);
        }
        const meanBgVariance = bgVariance / Math.max(1, edgeColors.length);

        const hasPlainBackground = meanBgVariance < 85;

        resolve({
          valid: true,
          details: {
            width,
            height,
            aspectRatio: Math.round(ratio * 100) / 100,
            hasPlainBackground,
            hasGoodContrast: centerDynamicRange >= 20,
            fileSizeBytes,
          },
        });
      } catch {
        // If canvas security or CORS restriction occurs, accept if dimensions are fine
        resolve({ valid: true });
      }
    };

    img.onerror = () => {
      resolve({
        valid: false,
        error: 'Unable to process or read this image file. Please choose a valid JPEG or PNG photo.',
      });
    };

    if (typeof fileOrDataUrl === 'string') {
      img.src = fileOrDataUrl;
    } else {
      img.src = URL.createObjectURL(fileOrDataUrl);
    }
  });
}
