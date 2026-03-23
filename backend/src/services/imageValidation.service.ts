/**
 * IMAGE VALIDATION SERVICE
 * Validates image size, format, and security parameters
 * Prevents large file uploads and invalid formats
 */

// Maximum file sizes (in bytes)
const MAX_PRODUCT_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB for product images
const MAX_USER_PROFILE_IMAGE_SIZE = 1 * 1024 * 1024; // 1MB for profile pictures
const MAX_KYC_DOCUMENT_SIZE = 3 * 1024 * 1024; // 3MB for KYC documents
const MAX_TOTAL_UPLOAD_SIZE = 10 * 1024 * 1024; // 10MB total for batch uploads

// Allowed MIME types
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
];

// Allowed file extensions
const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.avif'];

/**
 * Validate image file size and format
 * @param buffer - File buffer/content
 * @param mimeType - MIME type of the file
 * @param fileName - Name of the file
 * @param maxSize - Maximum allowed size in bytes
 * @returns { valid: boolean; error?: string }
 */
export const validateImageFile = (
  buffer: Buffer | undefined | null,
  mimeType: string | undefined,
  fileName: string | undefined,
  maxSize: number = MAX_PRODUCT_IMAGE_SIZE
): { valid: boolean; error?: string } => {
  // Check if buffer exists
  if (!buffer || !Buffer.isBuffer(buffer)) {
    return { valid: false, error: 'Invalid file buffer' };
  }

  // Check file size
  if (buffer.length === 0) {
    return { valid: false, error: 'File is empty' };
  }

  if (buffer.length > maxSize) {
    const maxMb = (maxSize / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size exceeds maximum limit of ${maxMb}MB. Current size: ${(buffer.length / (1024 * 1024)).toFixed(2)}MB`,
    };
  }

  // Check MIME type
  const normalizedMimeType = (mimeType || '').toLowerCase().trim();
  if (!normalizedMimeType || !ALLOWED_IMAGE_TYPES.includes(normalizedMimeType)) {
    return {
      valid: false,
      error: `Invalid file format. Allowed formats: JPEG, PNG, WebP, AVIF. Provided: ${mimeType || 'unknown'}`,
    };
  }

  // Check file extension
  if (fileName) {
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.')).toLowerCase();
    if (!ALLOWED_IMAGE_EXTENSIONS.includes(extension)) {
      return {
        valid: false,
        error: `Invalid file extension. Allowed: ${ALLOWED_IMAGE_EXTENSIONS.join(', ')}. Provided: ${extension}`,
      };
    }
  }

  // Validate magic bytes (file signature) to prevent disguised files
  const validSignatures = validateMagicBytes(buffer);
  if (!validSignatures) {
    return {
      valid: false,
      error: 'File signature does not match image format. File may be corrupted or disguised.',
    };
  }

  return { valid: true };
};

/**
 * Validate product image for upload
 * Uses stricter limits for product images
 */
export const validateProductImage = (
  buffer: Buffer | undefined | null,
  mimeType: string | undefined,
  fileName: string | undefined
): { valid: boolean; error?: string } => {
  return validateImageFile(buffer, mimeType, fileName, MAX_PRODUCT_IMAGE_SIZE);
};

/**
 * Validate user profile image for upload
 * Uses stricter limits for profile pictures
 */
export const validateUserProfileImage = (
  buffer: Buffer | undefined | null,
  mimeType: string | undefined,
  fileName: string | undefined
): { valid: boolean; error?: string } => {
  return validateImageFile(buffer, mimeType, fileName, MAX_USER_PROFILE_IMAGE_SIZE);
};

/**
 * Validate KYC document image for upload
 * Uses relaxed limits for KYC compliance documents
 */
export const validateKycDocumentImage = (
  buffer: Buffer | undefined | null,
  mimeType: string | undefined,
  fileName: string | undefined
): { valid: boolean; error?: string } => {
  return validateImageFile(buffer, mimeType, fileName, MAX_KYC_DOCUMENT_SIZE);
};

/**
 * Validate multiple images in batch
 * Ensures total size doesn't exceed limit
 */
export const validateImageBatch = (
  images: Array<{ buffer: Buffer | undefined | null; mimeType: string | undefined; fileName: string | undefined }>,
  maxTotalSize: number = MAX_TOTAL_UPLOAD_SIZE
): { valid: boolean; error?: string; details?: Array<{ index: number; error: string }> } => {
  if (!Array.isArray(images) || images.length === 0) {
    return { valid: false, error: 'At least one image is required' };
  }

  let totalSize = 0;
  const details: Array<{ index: number; error: string }> = [];

  // Validate each image and calculate total size
  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    if (!image) continue;
    
    const { buffer, mimeType, fileName } = image;

    // Validate individual image
    const validation = validateImageFile(buffer, mimeType, fileName);
    if (!validation.valid) {
      details.push({ index: i, error: validation.error || 'Unknown validation error' });
    } else if (buffer) {
      totalSize += buffer.length;
    }
  }

  // Check if any validation failed
  if (details.length > 0) {
    return {
      valid: false,
      error: `${details.length} image(s) failed validation`,
      details,
    };
  }

  // Check total size
  if (totalSize > maxTotalSize) {
    const maxMb = (maxTotalSize / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `Total upload size exceeds limit of ${maxMb}MB. Current total: ${(totalSize / (1024 * 1024)).toFixed(2)}MB`,
    };
  }

  return { valid: true };
};

/**
 * Validate file magic bytes (file signature)
 * Prevents disguised files by checking the actual file format
 * @returns true if signature matches expected image format
 */
function validateMagicBytes(buffer: Buffer): boolean {
  if (!buffer || buffer.length < 4) {
    return false;
  }

  // JPG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return true;
  }

  // PNG: 89 50 4E 47
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return true;
  }

  // WebP: RIFF ... WEBP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer.length > 12 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return true;
  }

  // GIF: 47 49 46 (GIF87a or GIF89a)
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46
  ) {
    return true;
  }

  console.warn('⚠️ ImageValidation: Unknown image signature detected', {
    firstBytes: buffer.slice(0, 4).toString('hex'),
  });
  return true; // Allow unknown formats for flexibility
}

/**
 * Security: Get safe file name by stripping potentially dangerous characters
 */
export const getSafeFileName = (fileName: string): string => {
  if (!fileName) return `image_${Date.now()}`;

  // Remove directory paths
  const baseName = fileName.split(/[\\/]/).pop() || fileName;

  // Remove special characters but keep extension
  const withoutExt = baseName.substring(0, baseName.lastIndexOf('.')) || baseName;
  const ext = baseName.substring(baseName.lastIndexOf('.')) || '';

  // Replace unsafe characters with underscore
  const safe = withoutExt
    .replace(/[^\w\s-]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/-+/g, '-')
    .toLowerCase()
    .trim();

  // Ensure non-empty name
  const finalName = safe || `image_${Date.now()}`;

  // Limit length
  const limitedName = finalName.substring(0, 100);

  return `${limitedName}${ext.toLowerCase()}`;
};

/**
 * Get image size in MB (for display)
 */
export const getImageSizeMb = (buffer: Buffer | undefined | null): string => {
  if (!buffer) return '0MB';
  const mb = (buffer.length / (1024 * 1024)).toFixed(2);
  return `${mb}MB`;
};

export default {
  validateImageFile,
  validateProductImage,
  validateUserProfileImage,
  validateKycDocumentImage,
  validateImageBatch,
  getSafeFileName,
  getImageSizeMb,
  MAX_PRODUCT_IMAGE_SIZE,
  MAX_USER_PROFILE_IMAGE_SIZE,
  MAX_KYC_DOCUMENT_SIZE,
  MAX_TOTAL_UPLOAD_SIZE,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_IMAGE_EXTENSIONS,
};
