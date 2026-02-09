import { v2 as cloudinary } from 'cloudinary';
import { config } from '../../config/index.js';

// Configure Cloudinary
// Cloudinary SDK automatically reads CLOUDINARY_URL if set, otherwise use individual config
if (process.env.CLOUDINARY_URL) {
  // CLOUDINARY_URL format: cloudinary://api_key:api_secret@cloud_name
  cloudinary.config({
    timeout: 60000, // 60 seconds timeout
  });
} else {
  // Fallback to individual config values
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
    timeout: 60000, // 60 seconds timeout
  });
}

export interface UploadResult {
  url: string;
  publicId: string;
  secureUrl: string;
}

/**
 * Upload a file buffer to Cloudinary
 */
export async function uploadToCloudinary(
  file: Express.Multer.File,
  folder?: string
): Promise<UploadResult> {
  if (!file.buffer) {
    throw new Error('File buffer is missing');
  }

  const uploadOptions: any = {
    resource_type: 'image',
    folder: folder || 'cleaning-agent',
  };

  try {
    // Use upload_stream for better performance with buffers (avoids base64 encoding overhead)
    const result = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      );
      
      // Write buffer to stream
      uploadStream.end(file.buffer);
    });
    return {
      url: result.url,
      publicId: result.public_id,
      secureUrl: result.secure_url,
    };
  } catch (error: any) {
    // Extract detailed error information from Cloudinary
    const errorMessage = error?.message || 'Unknown error';
    const httpCode = error?.http_code;
    const errorName = error?.name;
    
    console.error('[Cloudinary Error]', {
      message: errorMessage,
      http_code: httpCode,
      name: errorName,
      fullError: error,
    });
    
    // Provide more specific error messages
    if (httpCode === 499 || errorName === 'TimeoutError') {
      throw new Error(`Cloudinary upload timeout: The upload request took too long. Please try again or use a smaller file.`);
    }
    
    throw new Error(`Cloudinary upload failed: ${errorMessage}${httpCode ? ` (HTTP ${httpCode})` : ''}`);
  }
}

/**
 * Upload multiple files to Cloudinary
 */
export async function uploadMultipleToCloudinary(
  files: Express.Multer.File[],
  folder?: string
): Promise<UploadResult[]> {
  const uploadPromises = files.map((file) => uploadToCloudinary(file, folder));
  return Promise.all(uploadPromises);
}

/**
 * Delete an image from Cloudinary by public ID
 */
export async function deleteFromCloudinary(publicId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}
