import * as Minio from "minio";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || "minio",
  port: Number.parseInt(process.env.MINIO_PORT || "9000"),
  useSSL: process.env.MINIO_USE_SSL === "true",
  accessKey: process.env.MINIO_ACCESS_KEY || "akashadmin",
  secretKey: process.env.MINIO_SECRET_KEY || "Akash@Secret999",
});

const BUCKET = process.env.MINIO_BUCKET || "products";
const PUBLIC_URL = process.env.MINIO_PUBLIC_URL || "http://localhost:9000";

// Ensure bucket exists on startup
export const initMinio = async () => {
  try {
    const exists = await minioClient.bucketExists(BUCKET);
    if (!exists) {
      await minioClient.makeBucket(BUCKET);
      console.log(`✅ MinIO bucket '${BUCKET}' created`);
    } else {
      console.log(`✅ MinIO bucket '${BUCKET}' ready`);
    }
  } catch (err) {
    const endpoint = process.env.MINIO_ENDPOINT || "minio";
    const port = process.env.MINIO_PORT || "9000";
    console.error(`❌ MinIO init error (${endpoint}:${port}):`, err);
    throw err;
  }
};

/**
 * Upload a file buffer to MinIO
 * Returns the public URL of the uploaded file
 */
export const uploadToMinio = async (
  fileBuffer: Buffer,
  originalName: string,
  mimeType: string,
  folder = "products"
): Promise<string> => {
  const ext = path.extname(originalName) || ".jpg";
  const safeFolder = folder.replaceAll(/[^a-zA-Z0-9/_-]/g, "").replaceAll(/^\/+|\/+$/g, "") || "products";
  const objectName = `${safeFolder}/${uuidv4()}${ext}`;

  await minioClient.putObject(BUCKET, objectName, fileBuffer, fileBuffer.length, {
    "Content-Type": mimeType,
  });

  // Return public URL
  return `${PUBLIC_URL}/${BUCKET}/${objectName}`;
};

/**
 * Delete a file from MinIO by its public URL
 */
export const deleteFromMinio = async (fileUrl: string): Promise<void> => {
  try {
    // Extract object name from URL: http://localhost:9000/products/products/uuid.jpg
    const urlPath = fileUrl.replace(`${PUBLIC_URL}/${BUCKET}/`, "");
    await minioClient.removeObject(BUCKET, urlPath);
  } catch (err) {
    console.error("MinIO delete error:", err);
  }
};

export default minioClient;