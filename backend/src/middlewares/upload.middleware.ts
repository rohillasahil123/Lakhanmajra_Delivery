import multer from "multer";
import { Request, Response, NextFunction } from "express";

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
    files: 5,                   // max 5 images per product
  },
});

// Middleware to handle multer errors gracefully
export const handleUploadError = (err: any, _req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ success: false, message: "File too large. Max 5MB per image." });
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({ success: false, message: "Too many files. Max 5 images." });
    }
    return res.status(400).json({ success: false, message: err.message });
  }
  if (err?.message?.includes("images are allowed")) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next(err);
};