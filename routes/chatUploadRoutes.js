// routes/chatUploadRoutes.js
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import sharp from "sharp";
import { ok, fail } from "../utils/responses.js";

const router = express.Router();

// 📁 Ensure upload directory exists
const uploadDir = "uploads/chat";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log(`📁 Created folder: ${uploadDir}`);
}

// ⚙️ Config
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;
const FILE_LIFETIME_DAYS = 30;

// 🧱 Multer setup
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const allowed = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "application/zip",
  "application/x-zip-compressed",
  "application/x-rar-compressed",
  "application/octet-stream",
];

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (allowed.includes(file.mimetype)) cb(null, true);
    else {
      console.warn(`⚠️ Unknown MIME type: ${file.mimetype}, accepting anyway`);
      cb(null, true);
    }
  },
});

// 🧩 Detect file type
function detectFileType(filename) {
  const ext = path.extname(filename).toLowerCase();
  if ([".png", ".jpg", ".jpeg", ".gif", ".webp", ".heic", ".heif"].includes(ext)) return "image";
  if ([".pdf"].includes(ext)) return "pdf";
  if ([".zip", ".rar"].includes(ext)) return "archive";
  if ([".doc", ".docx"].includes(ext)) return "document";
  if ([".txt"].includes(ext)) return "text";
  return "file";
}

// 🧩 Compress images larger than 1 MB
async function compressImageIfNeeded(filePath) {
  try {
    const stats = fs.statSync(filePath);
    if (stats.size < 1 * 1024 * 1024) return;

    const ext = path.extname(filePath).toLowerCase();
    const compressedPath = filePath.replace(ext, "_compressed.jpg");

    await sharp(filePath)
      .resize({ width: 1280, withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toFile(compressedPath);

    fs.unlinkSync(filePath);
    fs.renameSync(compressedPath, filePath);
    console.log(
      `🧩 Compressed image: ${path.basename(filePath)} → ${(fs.statSync(filePath).size / 1024 / 1024).toFixed(2)} MB`
    );
  } catch (err) {
    console.warn("⚠️ Compression skipped:", err.message);
  }
}

// 🧹 Auto-cleanup job: delete files older than 30 days
function cleanupOldFiles() {
  try {
    const now = Date.now();
    const limit = FILE_LIFETIME_DAYS * 24 * 60 * 60 * 1000;

    const files = fs.readdirSync(uploadDir);
    let deleted = 0;

    files.forEach((file) => {
      const filePath = path.join(uploadDir, file);
      const stats = fs.statSync(filePath);
      if (now - stats.mtimeMs > limit) {
        fs.unlinkSync(filePath);
        deleted++;
      }
    });

    if (deleted > 0)
      console.log(`🧹 Cleaned ${deleted} old chat files (> ${FILE_LIFETIME_DAYS} days)`);
  } catch (err) {
    console.error("❌ Cleanup failed:", err.message);
  }
}

// Run cleanup every 24 hours
setInterval(cleanupOldFiles, 24 * 60 * 60 * 1000);
// Also run once at startup
cleanupOldFiles();

// 🟢 Upload endpoint
router.post("/", (req, res) => {
  upload.single("file")(req, res, async function (err) {
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE")
      return fail(res, 400, `File too large. Max ${MAX_FILE_SIZE_MB} MB`);
    if (err) return fail(res, 400, err.message);
    if (!req.file) return fail(res, 400, "No file uploaded");

    const filePath = path.join(uploadDir, req.file.filename);
    const type = detectFileType(req.file.originalname);

    if (type === "image") await compressImageIfNeeded(filePath);

    const url = `${process.env.BASE_URL || "https://osta-backend.onrender.com"}/uploads/chat/${req.file.filename}`;
    console.log(`📤 Uploaded chat file: ${req.file.originalname} → type=${type}`);

    return ok(res, { url, type });
  });
});

export default router;
