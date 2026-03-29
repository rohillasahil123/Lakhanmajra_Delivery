import multer from "multer";
import { Request, Response, NextFunction } from "express";
import { validateImageBatch, validateKycDocumentImage, getSafeFileName } from "../services/imageValidation.service";
import { logWarn, logError } from "../utils/logger";

// Store in memory (buffer) — we upload directly to MinIO
const storage = multer.memoryStorage();

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG, PNG, WEBP, GIF, SVG images are allowed"));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max per file
    files: 10,                  // max 5 product images + 5 variant images
  },
});

const riderDocumentFileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "application/pdf",
  ];

  if (allowed.includes(file.mimetype)) {
    cb(null, true);
    return;
  }

  cb(new Error("Only JPEG, PNG, WEBP, GIF, or PDF files are allowed"));
};

export const uploadRiderDocument = multer({
  storage,
  fileFilter: riderDocumentFileFilter,
  limits: {
    fileSize: 8 * 1024 * 1024,
    files: 1,
  },
});

/**
 * Enhanced validation middleware for uploaded files
 * Validates file size, format, magic bytes, and file integrity
 * SECURITY: Prevents malicious file uploads
 */
export const validateUploadedImages = (req: Request, res: Response, next: NextFunction) => {
  if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
    return next();
  }

  const files = req.files as Express.Multer.File[];
  const imagesToValidate = files.map((f) => ({
    buffer: f.buffer,
    mimeType: f.mimetype,
    fileName: f.originalname,
  }));

  // Validate batch
  const batchValidation = validateImageBatch(imagesToValidate);
  if (!batchValidation.valid) {
    logWarn('Upload: Image validation failed', {
      uploadPath: req.path,
      errorCount: batchValidation.details?.length || 0,
      totalError: batchValidation.error,
    });
    return res.status(400).json({
      success: false,
      message: batchValidation.error || 'Image validation failed',
      details: batchValidation.details,
    });
  }

  // Sanitize file names for safety
  (req.files as Express.Multer.File[]).forEach((file) => {
    (file as any).safeOriginalname = getSafeFileName(file.originalname);
  });

  next();
};

/**
 * Validation middleware for KYC document uploads
 * Uses relaxed size limits for compliance documents
 */
export const validateKycDocumentUploads = (req: Request, res: Response, next: NextFunction) => {
  if (!req.file) {
    return next();
  }

  const validation = validateKycDocumentImage(
    req.file.buffer,
    req.file.mimetype,
    req.file.originalname
  );

  if (!validation.valid) {
    logWarn('Upload: KYC document validation failed', {
      fileName: req.file.originalname,
      error: validation.error,
    });
    return res.status(400).json({
      success: false,
      message: validation.error || 'KYC document validation failed',
    });
  }

  // Sanitize file name
  (req.file as any).safeOriginalname = getSafeFileName(req.file.originalname);

  next();
};

// Middleware to handle multer errors gracefully
export const handleUploadError = (err: any, _req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ success: false, message: "File too large. Max size exceeded per image." });
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({ success: false, message: "Too many files. Max 5 images per upload." });
    }
    logWarn('Upload multer error', { code: err.code, message: err.message });
    return res.status(400).json({ success: false, message: err.message });
  }
  if (err?.message?.includes("images are allowed")) {
    return res.status(400).json({ success: false, message: err.message });
  }
  if (err?.message?.includes("PDF files are allowed")) {
    return res.status(400).json({ success: false, message: err.message });
  }
  logError('Upload error', err);
  return next(err);
};