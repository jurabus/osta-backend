// routes/chatUploadRoutes.js
import express from "express";
import multer from "multer";
import path from "path";
import { ok, fail } from "../utils/responses.js";

const router = express.Router();

// ✅ Allow all safe file types
const storage = multer.diskStorage({
  destination: "uploads/chat/",
  filename: (_req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "application/pdf",
      "application/zip",
      "application/x-zip-compressed",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Unsupported file type"));
  },
});

router.post("/", upload.single("file"), (req, res) => {
  if (!req.file) return fail(res, 400, "No file uploaded");
  const url = `${process.env.BASE_URL || "https://osta-backend.onrender.com"}/uploads/chat/${req.file.filename}`;
  const ext = path.extname(req.file.originalname).toLowerCase();

  let type = "file";
  if ([".png", ".jpg", ".jpeg"].includes(ext)) type = "image";
  else if ([".pdf"].includes(ext)) type = "pdf";

  return ok(res, { url, type });
});

export default router;
