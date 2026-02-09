/**
 * Constructs the correct URL for uploaded images.
 * In development, use direct backend URL to avoid proxy issues with images.
 * In production, can use relative URLs if backend and frontend are on same domain.
 */
export function getImageUrl(imagePath: string): string {
  if (!imagePath) return '';
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // Ensure path starts with /api/uploads/
  let cleanPath = imagePath;
  if (!imagePath.startsWith('/api/uploads/')) {
    if (imagePath.startsWith('/uploads/')) {
      cleanPath = `/api${imagePath}`;
    } else if (!imagePath.startsWith('/')) {
      cleanPath = `/api/uploads/${imagePath}`;
    } else {
      cleanPath = imagePath;
    }
  }
  
  // In development, use direct backend URL to avoid proxy issues
  const isDev = import.meta.env.DEV;
  if (isDev) {
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
    return `${backendUrl}${cleanPath}`;
  }
  
  // In production, use relative URL
  return cleanPath;
}

/**
 * Gets fallback URL directly to backend (for error handling)
 */
export function getImageUrlFallback(imagePath: string): string {
  if (!imagePath) return '';
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
  const cleanPath = imagePath.startsWith('/') ? imagePath : `/api/uploads/${imagePath}`;
  return `${backendUrl}${cleanPath}`;
}
