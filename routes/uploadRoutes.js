import express from "express";
import multer from "multer";
import bucket from "../firebase.js";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() }).single("image");

// Extract and delete Firebase file by its public URL
async function deleteFileByUrl(url) {
  try {
    if (!url) return;

    const decoded = decodeURIComponent(url);
    const match = decoded.match(/\/o\/(.+)\?alt=media/);

    if (match && match[1]) {
      const filePath = match[1];
      await bucket.file(filePath).delete({ ignoreNotFound: true });
      console.log(`🗑 Deleted: ${filePath}`);
    }
  } catch (e) {
    console.warn("⚠ Delete failed:", e.message);
  }
}

// POST /api/upload
router.post("/", (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    if (!req.file) return res.status(400).json({ success: false, message: "No image uploaded" });

    try {
      const oldUrl = req.body.oldUrl;
      const fileName = `uploads/${Date.now()}-${uuidv4()}-${req.file.originalname}`;
      const file = bucket.file(fileName);

      await file.save(req.file.buffer, {
        metadata: {
          contentType: req.file.mimetype,
          cacheControl: "public, max-age=31536000",
        },
      });

      await file.makePublic();

      const publicUrl =
        `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media`;

      if (oldUrl) await deleteFileByUrl(oldUrl);

      res.json({ success: true, url: publicUrl });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });
});

export default router;
