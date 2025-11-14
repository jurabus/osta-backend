import express from "express";
import multer from "multer";
import bucket from "../firebase.js";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

// Memory storage (no disk!)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// -----------------------------
// 🔥 Helper: Delete by Firebase URL
// -----------------------------
async function deleteFileByUrl(url) {
  try {
    if (!url) return;

    const decoded = decodeURIComponent(url);
    const match = decoded.match(/\/o\/(.+)\?alt=media/);

    if (match && match[1]) {
      const filePath = match[1];
      await bucket.file(filePath).delete({ ignoreNotFound: true });
      console.log("🗑️ Deleted:", filePath);
    }
  } catch (err) {
    console.warn("⚠️ Delete failed:", err.message);
  }
}

// -----------------------------
// 📸 POST /api/upload/:folder
// -----------------------------
router.post("/:folder", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image uploaded" });
    }

    const folder = req.params.folder || "uploads";
    const oldUrl = req.body.oldUrl || null;

    // Generate unique file path
    const fileName = `${folder}/${Date.now()}-${uuidv4()}-${req.file.originalname}`;
    const file = bucket.file(fileName);

    // Upload to Firebase
    await file.save(req.file.buffer, {
      metadata: {
        contentType: req.file.mimetype,
        cacheControl: "public, max-age=31536000",
      },
    });

    // Make public URL
    await file.makePublic();

    const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(
      fileName
    )}?alt=media`;

    console.log(`✅ Uploaded → ${fileName}`);

    // Delete old file if requested
    if (oldUrl) await deleteFileByUrl(oldUrl);

    res.json({ success: true, url });
  } catch (err) {
    console.error("❌ Upload error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// -----------------------------
// 🗑 DELETE /api/upload
// -----------------------------
router.delete("/", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ success: false, message: "Missing url" });

    await deleteFileByUrl(url);
    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
