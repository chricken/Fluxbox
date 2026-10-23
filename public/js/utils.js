/**
 * Calculates pixel dimensions (width & height) adhering to 32px multiples
 * based on aspect ratio, resolution in Megapixels, and orientation.
 *
 * @param {string} aspectRatio - e.g. "1:1", "4:3", "16:9", "21:9"
 * @param {number} resolutionMP - Megapixels, e.g. 0.25, 0.5, 1, 2, 4
 * @param {string} orientation - "horizontal" or "vertical"
 * @returns {{ width: number, height: number }}
 */
export function calculateDimensions(aspectRatio, resolutionMP, orientation) {
  const [a, b] = aspectRatio.split(':').map(Number);
  const totalPixels = resolutionMP * 1000000;

  let width;
  let height;

  if (orientation === 'horizontal') {
    width = Math.sqrt(totalPixels * a / b);
    height = Math.sqrt(totalPixels * b / a);
  } else {
    height = Math.sqrt(totalPixels * a / b);
    width = Math.sqrt(totalPixels * b / a);
  }

  width = Math.max(32, Math.round(width / 32) * 32);
  height = Math.max(32, Math.round(height / 32) * 32);

  return { width, height };
}

/**
 * Formats a credits number nicely for UI display.
 *
 * @param {number|null|undefined} val
 * @returns {string}
 */
export function formatCredits(val) {
  if (val === null || val === undefined || isNaN(val)) return '--';
  const num = Number(val);
  return `${num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 3 })} Credits`;
}

/**
 * Fetches an image blob using the backend proxy endpoint to circumvent CORS restrictions.
 *
 * @param {string} imageUrl
 * @param {string} [filename='flux-image.jpg']
 * @returns {Promise<Blob>}
 */
export async function fetchImageBlob(imageUrl, filename = 'flux-image.jpg') {
  // Use our backend download endpoint to fetch without CORS blocking
  const proxyUrl = `/api/download?url=${encodeURIComponent(imageUrl)}&filename=${encodeURIComponent(filename)}`;
  const res = await fetch(proxyUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch image data via proxy (${res.status})`);
  }
  return await res.blob();
}

/**
 * Triggers direct download of an image file to the user's downloads folder.
 *
 * @param {string} imageUrl
 * @param {string} filename
 * @returns {Promise<void>}
 */
export async function downloadImageFile(imageUrl, filename = 'flux-image.jpg') {
  try {
    const blob = await fetchImageBlob(imageUrl, filename);
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  } catch (err) {
    console.error('Download failed via blob, falling back to proxy iframe/link:', err);
    // Fallback: direct navigation to attachment endpoint
    const proxyUrl = `/api/download?url=${encodeURIComponent(imageUrl)}&filename=${encodeURIComponent(filename)}`;
    const a = document.createElement('a');
    a.href = proxyUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}
